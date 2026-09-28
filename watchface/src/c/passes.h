#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

// Pass records from the phone (src/pkjs/passes.js packPasses): 10 bytes, little-endian.
#define PASS_BYTES 10
#define PASS_MAX 64     // ~30 days of past acquisitions + 16 days of predictions
#define PASS_EDGE 1     // near the swath edge: may miss the target
#define PASS_PARTIAL 2  // satellite on a partial acquisition plan (Sentinel-2A)
#define PASS_SCENE 4    // past: a real scene exists; cloud = the scene's cloud cover (whole scene)
#define PASS_PENDING 8  // past: no scene yet, still inside the product lag
#define PASS_MISSED 16  // past: no scene and the lag has elapsed
#define PASS_WEAK 32    // future pass > 5 days out: cloud forecast has little skill
#define PASS_PAST (PASS_SCENE | PASS_PENDING | PASS_MISSED)
#define PASS_DIST_UNKNOWN 65535  // scene with no predicted pass
#define PASS_NOW_S 120  // within +-2 min counts as "NOW"

typedef struct {
  uint32_t time;    // unix UTC
  uint8_t platform; // 0 L8, 1 L9, 2 S2A, 3 S2B, 4 S2C
  uint8_t flags;
  uint16_t dist10;  // off-track km x 10
  int8_t cloud;     // %, -1 unknown
} Pass;

// Parse up to `max` records; returns the count.
int passes_parse(const uint8_t *data, int len, Pass *out, int max);

// "NOW" within +-2 min, "HH:MM" under a day, "Nd HHh" beyond; past: "NM AGO", "NH AGO", "Nd AGO".
void passes_countdown(int32_t seconds_until, char *buf, size_t n);

const char *passes_platform_name(uint8_t code);   // "LANDSAT 9"
const char *passes_platform_short(uint8_t code);  // "L9"

// Index of the first pass not yet over (time >= now - PASS_NOW_S), or count if none.
int passes_next(const Pass *p, int count, uint32_t now);
