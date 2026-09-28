#pragma once
#include <pebble.h>

#define MAP_LAND_MAX 900
#define MAP_TRACK_BYTES 12

void map_receive(DictionaryIterator *it, int count, uint32_t generated);
void map_restore(int count, uint32_t generated);
void map_draw(GContext *ctx, int selected, uint8_t flags);
const char *map_location(void);
