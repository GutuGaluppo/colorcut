/// A deterministic median-cut color quantizer. Perceptual refinement (k-means,
/// merging near-duplicate clusters) is intentionally deferred — see
/// IMPLEMENTATION.md §8, which accepts plain median-cut for the first vertical slice.
pub struct Cluster {
    pub color: [u8; 3],
    pub population: usize,
}

struct Bucket {
    pixels: Vec<[u8; 3]>,
}

fn channel_range(pixels: &[[u8; 3]], channel: usize) -> u16 {
    let mut min = 255u8;
    let mut max = 0u8;
    for pixel in pixels {
        let value = pixel[channel];
        min = min.min(value);
        max = max.max(value);
    }
    u16::from(max) - u16::from(min)
}

fn widest_channel(pixels: &[[u8; 3]]) -> usize {
    (0..3)
        .max_by_key(|&channel| channel_range(pixels, channel))
        .unwrap_or(0)
}

fn average_color(pixels: &[[u8; 3]]) -> [u8; 3] {
    let mut sums = [0u64; 3];
    for pixel in pixels {
        for (channel, value) in pixel.iter().enumerate() {
            sums[channel] += u64::from(*value);
        }
    }
    let count = pixels.len().max(1) as u64;
    [
        (sums[0] / count) as u8,
        (sums[1] / count) as u8,
        (sums[2] / count) as u8,
    ]
}

/// Quantizes `pixels` into at most `target_count` representative colors, sorted by
/// nothing in particular (the caller sorts by weight). Returns fewer than
/// `target_count` clusters only when there aren't enough distinct pixels to split further.
pub fn quantize(pixels: Vec<[u8; 3]>, target_count: usize) -> Vec<Cluster> {
    if pixels.is_empty() || target_count == 0 {
        return Vec::new();
    }

    let mut buckets = vec![Bucket { pixels }];

    loop {
        if buckets.len() >= target_count {
            break;
        }
        // Weight by population * color range, not population alone: a large, nearly
        // uniform-color region (e.g. a plain studio background) has far more pixels
        // than a small but colorful subject, and splitting by population alone keeps
        // re-slicing that flat region into near-duplicate shades while the subject's
        // skin/hair/eye/clothing colors never get their own bucket.
        let split_index = buckets
            .iter()
            .enumerate()
            .filter_map(|(index, bucket)| {
                let range = channel_range(&bucket.pixels, widest_channel(&bucket.pixels));
                (bucket.pixels.len() > 1 && range > 0)
                    .then_some((index, bucket.pixels.len() * usize::from(range)))
            })
            .max_by_key(|&(_, weight)| weight)
            .map(|(index, _)| index);

        let Some(index) = split_index else { break };
        let mut bucket = buckets.remove(index);
        let channel = widest_channel(&bucket.pixels);
        bucket.pixels.sort_unstable_by_key(|pixel| pixel[channel]);
        let mid = bucket.pixels.len() / 2;
        let second_half = bucket.pixels.split_off(mid);
        buckets.push(Bucket {
            pixels: bucket.pixels,
        });
        buckets.push(Bucket {
            pixels: second_half,
        });
    }

    buckets
        .into_iter()
        .map(|bucket| Cluster {
            color: average_color(&bucket.pixels),
            population: bucket.pixels.len(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_no_clusters_for_empty_input() {
        assert!(quantize(Vec::new(), 8).is_empty());
    }

    #[test]
    fn never_returns_more_clusters_than_the_target_count() {
        let pixels = vec![[10, 10, 10], [10, 10, 10], [200, 200, 200]];
        let clusters = quantize(pixels, 8);
        assert!(clusters.len() <= 8);
    }

    #[test]
    fn produces_exactly_the_requested_count_when_enough_variety_exists() {
        let mut pixels = Vec::new();
        for r in 0..8u16 {
            for _ in 0..20 {
                pixels.push([(r * 32) as u8, 0, 0]);
            }
        }
        let clusters = quantize(pixels, 8);
        assert_eq!(clusters.len(), 8);
    }

    #[test]
    fn a_large_low_variance_region_does_not_crowd_out_a_smaller_colorful_subject() {
        // Mimics a studio-background photo: ~87% of pixels are a near-uniform pink
        // wall (small channel range), the rest are a handful of very different
        // subject colors (skin, hair, eyes, denim) with far fewer pixels each.
        let mut pixels = Vec::new();
        for i in 0..800u32 {
            let jitter = (i % 5) as u8;
            pixels.push([210 + jitter, 190 + jitter, 200 + jitter]);
        }
        let subject_colors: [[u8; 3]; 4] = [
            [235, 195, 170], // skin
            [90, 60, 40],    // hair
            [80, 140, 160],  // eyes
            [120, 130, 150], // denim
        ];
        for color in subject_colors {
            for _ in 0..50 {
                pixels.push(color);
            }
        }

        let clusters = quantize(pixels, 16);

        // Every distinct subject color must land in its own cluster (closest by
        // Euclidean distance), not get merged away into a background-dominated bucket.
        for subject_color in subject_colors {
            let nearest = clusters
                .iter()
                .min_by_key(|cluster| {
                    cluster
                        .color
                        .iter()
                        .zip(subject_color.iter())
                        .map(|(a, b)| (i32::from(*a) - i32::from(*b)).pow(2))
                        .sum::<i32>()
                })
                .expect("quantize returned at least one cluster");
            let distance_sq: i32 = nearest
                .color
                .iter()
                .zip(subject_color.iter())
                .map(|(a, b)| (i32::from(*a) - i32::from(*b)).pow(2))
                .sum();
            assert!(
                distance_sq < 400,
                "no cluster close to subject color {subject_color:?}; closest was {:?} (dist_sq={distance_sq})",
                nearest.color
            );
        }
    }

    #[test]
    fn cluster_populations_sum_to_the_input_pixel_count() {
        let pixels = vec![
            [0, 0, 0],
            [10, 10, 10],
            [250, 250, 250],
            [255, 255, 255],
            [128, 64, 32],
        ];
        let clusters = quantize(pixels.clone(), 4);
        let total: usize = clusters.iter().map(|cluster| cluster.population).sum();
        assert_eq!(total, pixels.len());
    }

    #[test]
    fn is_deterministic_across_runs() {
        let pixels: Vec<[u8; 3]> = (0..300)
            .map(|i| {
                [
                    (i % 256) as u8,
                    ((i * 7) % 256) as u8,
                    ((i * 13) % 256) as u8,
                ]
            })
            .collect();
        let first: Vec<[u8; 3]> = quantize(pixels.clone(), 6)
            .into_iter()
            .map(|c| c.color)
            .collect();
        let second: Vec<[u8; 3]> = quantize(pixels, 6).into_iter().map(|c| c.color).collect();
        assert_eq!(first, second);
    }

    #[test]
    fn averages_a_uniform_bucket_exactly() {
        let pixels = vec![[100, 150, 200]; 10];
        let clusters = quantize(pixels, 4);
        assert_eq!(clusters.len(), 1);
        assert_eq!(clusters[0].color, [100, 150, 200]);
        assert_eq!(clusters[0].population, 10);
    }
}
