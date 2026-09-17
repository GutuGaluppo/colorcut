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
        let split_index = buckets
            .iter()
            .enumerate()
            .filter(|(_, bucket)| {
                bucket.pixels.len() > 1
                    && channel_range(&bucket.pixels, widest_channel(&bucket.pixels)) > 0
            })
            .max_by_key(|(_, bucket)| bucket.pixels.len())
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
