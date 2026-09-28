// Host harness for passes.c.  parse <hex>  -> fields per record;  countdown <seconds> -> text
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "passes.h"

int main(int argc, char **argv) {
  if (argc == 3 && !strcmp(argv[1], "countdown")) {
    char buf[32];
    passes_countdown((int32_t)atol(argv[2]), buf, sizeof(buf));
    printf("%s\n", buf);
    return 0;
  }
  if (argc == 3 && !strcmp(argv[1], "parse")) {
    static uint8_t data[PASS_MAX * PASS_BYTES];
    int len = (int)strlen(argv[2]) / 2;
    for (int i = 0; i < len && i < (int)sizeof(data); i++) sscanf(argv[2] + 2 * i, "%2hhx", &data[i]);
    Pass p[PASS_MAX];
    int n = passes_parse(data, len, p, PASS_MAX);
    for (int i = 0; i < n; i++) {
      printf("%u %u %u %u %d %s\n", p[i].time, p[i].platform, p[i].flags, p[i].dist10, p[i].cloud,
             passes_platform_short(p[i].platform));
    }
    return 0;
  }
  return 2;
}
