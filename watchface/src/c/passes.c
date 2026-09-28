#include "passes.h"

#include <stdio.h>

static const char *const NAMES[] = {"LANDSAT 8", "LANDSAT 9", "SENTINEL-2A", "SENTINEL-2B", "SENTINEL-2C"};
static const char *const SHORT[] = {"L8", "L9", "S2A", "S2B", "S2C"};

int passes_parse(const uint8_t *d, int len, Pass *out, int max) {
  int n = 0;
  for (int i = 0; i + PASS_BYTES <= len && n < max; i += PASS_BYTES) {
    const uint8_t *r = d + i;
    out[n++] = (Pass){
        .time = (uint32_t)r[0] | (uint32_t)r[1] << 8 | (uint32_t)r[2] << 16 | (uint32_t)r[3] << 24,
        .platform = r[4],
        .flags = r[5],
        .dist10 = (uint16_t)(r[6] | r[7] << 8),
        .cloud = (int8_t)r[8],
    };
  }
  return n;
}

void passes_countdown(int32_t s, char *buf, size_t n) {
  if (s < -PASS_NOW_S) {
    snprintf(buf, n, "PASSED");
  } else if (s <= PASS_NOW_S) {
    snprintf(buf, n, "NOW");
  } else if (s < 86400) {
    int32_t m = (s + 59) / 60;  // round up: never claim less time than there is
    snprintf(buf, n, "%02d:%02d", (int)(m / 60), (int)(m % 60));
  } else {
    snprintf(buf, n, "%dd %02dh", (int)(s / 86400), (int)(s % 86400 / 3600));
  }
}

const char *passes_platform_name(uint8_t code) {
  return code < 5 ? NAMES[code] : "?";
}

const char *passes_platform_short(uint8_t code) {
  return code < 5 ? SHORT[code] : "?";
}

int passes_next(const Pass *p, int count, uint32_t now) {
  for (int i = 0; i < count; i++) {
    if ((int64_t)p[i].time >= (int64_t)now - PASS_NOW_S) return i;
  }
  return count;
}
