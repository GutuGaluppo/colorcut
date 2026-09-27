//! Picks a final palette from an over-segmented set of median-cut candidates
//! (ADR-015).
//!
//! Plain median cut spends its slots on the most populous regions, so a small
//! but visually important color (a sunset band, lit windows, a neon sign) gets
//! averaged away into a larger, duller bucket. Instead, candidates are chosen
//! greedily in OKLab space: the most populous candidate first, then whichever
//! remaining candidate scores highest on
//! `sqrt(share) * distance_to_nearest_chosen * (1 + CHROMA_BOOST * chroma)`.
//! That favors colors that are both present and different from what's already
//! in the palette, gives vivid colors a modest edge, and naturally skips
//! near-duplicate shades. Every candidate's pixels are then credited to its
//! nearest chosen color, so the percentages still cover the whole image.

use super::color_conversion::rgb_to_oklab;
use super::median_cut::Cluster;
use crate::models::RgbColor;

/// How many median-cut candidates to generate for a requested palette size.
pub fn candidate_count(target_count: usize) -> usize {
    (target_count * 4).max(48)
}

/// Candidates below this share of all sampled pixels are treated as noise
/// (compression artifacts, stray edge pixels) and never picked on their own.
/// The floor shrinks for palettes above 16 colors: with more, smaller candidates,
/// a fixed floor started discarding real accents (ADR-016).
const MIN_SHARE: f32 = 0.002;

fn min_share(target_count: usize) -> f32 {
    MIN_SHARE * (16.0 / target_count as f32).min(1.0)
}
/// Extra weight for chroma, so a vivid accent beats an equally distant grey.
const CHROMA_BOOST: f32 = 4.0;

struct Candidate {
    color: [u8; 3],
    lab: [f32; 3],
    population: usize,
}

fn distance_sq(a: [f32; 3], b: [f32; 3]) -> f32 {
    (0..3).map(|i| (a[i] - b[i]).powi(2)).sum()
}

fn nearest(lab: [f32; 3], chosen: &[usize], candidates: &[Candidate]) -> usize {
    (0..chosen.len())
        .min_by(|&x, &y| {
            distance_sq(lab, candidates[chosen[x]].lab)
                .total_cmp(&distance_sq(lab, candidates[chosen[y]].lab))
        })
        .expect("at least one color is always chosen")
}

/// Reduces `clusters` to at most `target_count` colors. Each returned cluster
/// keeps its chosen candidate's color (not an average, which would dull vivid
/// accents) and the summed population of every candidate assigned to it.
pub fn select(clusters: Vec<Cluster>, target_count: usize) -> Vec<Cluster> {
    if clusters.is_empty() || target_count == 0 {
        return Vec::new();
    }

    let total: usize = clusters.iter().map(|cluster| cluster.population).sum();
    let candidates: Vec<Candidate> = clusters
        .into_iter()
        .map(|cluster| Candidate {
            color: cluster.color,
            lab: rgb_to_oklab(RgbColor {
                r: cluster.color[0],
                g: cluster.color[1],
                b: cluster.color[2],
            }),
            population: cluster.population,
        })
        .collect();

    // Ties resolve to the lowest index so the result is deterministic.
    let first = (0..candidates.len())
        .max_by(|&x, &y| {
            candidates[x]
                .population
                .cmp(&candidates[y].population)
                .then(y.cmp(&x))
        })
        .expect("candidates is not empty");
    let mut chosen = vec![first];

    while chosen.len() < target_count {
        let next = (0..candidates.len())
            .filter(|index| !chosen.contains(index))
            .filter(|&index| {
                candidates[index].population as f32 / total as f32 >= min_share(target_count)
            })
            .map(|index| {
                let candidate = &candidates[index];
                let share = candidate.population as f32 / total as f32;
                let distance = distance_sq(
                    candidate.lab,
                    candidates[chosen[nearest(candidate.lab, &chosen, &candidates)]].lab,
                )
                .sqrt();
                let chroma = candidate.lab[1].hypot(candidate.lab[2]);
                (
                    index,
                    share.sqrt() * distance * (1.0 + CHROMA_BOOST * chroma),
                )
            })
            .filter(|&(_, score)| score > 0.0)
            .max_by(|x, y| x.1.total_cmp(&y.1).then(y.0.cmp(&x.0)));
        match next {
            Some((index, _)) => chosen.push(index),
            None => break,
        }
    }

    let mut populations = vec![0usize; chosen.len()];
    for candidate in &candidates {
        populations[nearest(candidate.lab, &chosen, &candidates)] += candidate.population;
    }

    chosen
        .iter()
        .zip(populations)
        .map(|(&index, population)| Cluster {
            color: candidates[index].color,
            population,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cluster(color: [u8; 3], population: usize) -> Cluster {
        Cluster { color, population }
    }

    #[test]
    fn returns_nothing_for_empty_input() {
        assert!(select(Vec::new(), 8).is_empty());
    }

    #[test]
    fn keeps_the_most_populous_color_first() {
        let result = select(
            vec![cluster([20, 20, 20], 10), cluster([200, 30, 30], 90)],
            1,
        );
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].color, [200, 30, 30]);
        assert_eq!(result[0].population, 100);
    }

    #[test]
    fn preserves_the_total_population() {
        let clusters = vec![
            cluster([10, 10, 10], 40),
            cluster([12, 12, 12], 30),
            cluster([240, 120, 20], 5),
            cluster([30, 60, 200], 25),
        ];
        let total: usize = clusters.iter().map(|c| c.population).sum();
        let result = select(clusters, 3);
        assert_eq!(result.iter().map(|c| c.population).sum::<usize>(), total);
    }

    #[test]
    fn a_small_vivid_accent_beats_near_duplicate_dark_shades() {
        // A dusk landscape: most pixels are dark slate/navy shades that differ only
        // slightly; a small, vivid orange (lit windows / sunset) covers 3%.
        let mut clusters: Vec<Cluster> = (0..12u8)
            .map(|i| cluster([30 + i * 3, 34 + i * 3, 48 + i * 3], 80))
            .collect();
        clusters.push(cluster([235, 110, 40], 30));

        let result = select(clusters, 4);

        assert!(
            result.iter().any(|c| c.color == [235, 110, 40]),
            "the vivid accent should be kept, got {:?}",
            result.iter().map(|c| c.color).collect::<Vec<_>>()
        );
    }

    #[test]
    fn ignores_candidates_below_the_noise_threshold() {
        let clusters = vec![
            cluster([20, 20, 20], 5000),
            cluster([255, 0, 255], 1), // 0.02%: noise
            cluster([220, 220, 220], 3000),
        ];
        let result = select(clusters, 3);
        assert!(result.iter().all(|c| c.color != [255, 0, 255]));
    }

    #[test]
    fn does_not_duplicate_identical_colors() {
        let clusters = vec![cluster([50, 50, 50], 50), cluster([50, 50, 50], 50)];
        let result = select(clusters, 2);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].population, 100);
    }

    #[test]
    fn is_deterministic() {
        let make = || {
            (0..40u8)
                .map(|i| {
                    cluster(
                        [i.wrapping_mul(37), i.wrapping_mul(91), i.wrapping_mul(13)],
                        10 + i as usize,
                    )
                })
                .collect::<Vec<_>>()
        };
        let first: Vec<_> = select(make(), 8).into_iter().map(|c| c.color).collect();
        let second: Vec<_> = select(make(), 8).into_iter().map(|c| c.color).collect();
        assert_eq!(first, second);
    }
}
