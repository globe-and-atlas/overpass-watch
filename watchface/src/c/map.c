#include "map.h"
#include "passes.h"
#include <string.h>

static uint8_t s_land[MAP_LAND_MAX], s_tracks[PASS_MAX * MAP_TRACK_BYTES];
static int s_land_len, s_track_count;
static char s_location[32];
static GPoint s_points[MAP_LAND_MAX / 2];

static bool persist_bytes(int key, const uint8_t *data, int length) {
  for (int off = 0; off < length; off += 200) {
    int n = length - off < 200 ? length - off : 200;
    if (persist_write_data(key++, data + off, n) != n) return false;
  }
  return true;
}

static bool read_bytes(int key, uint8_t *data, int length) {
  for (int off = 0; off < length; off += 200) {
    int n = length - off < 200 ? length - off : 200;
    if (persist_read_data(key++, data + off, n) != n) return false;
  }
  return true;
}

static bool valid_land(void) {
  if (s_land_len % 2) return false;
  for (int i = 0; i < s_land_len; i += 2) {
    if (s_land[i] == 255 && s_land[i + 1] == 255) continue;
    if (s_land[i] > 191 || s_land[i + 1] > 119) return false;
  }
  return !s_land_len || (s_land[s_land_len - 2] == 255 && s_land[s_land_len - 1] == 255);
}

void map_restore(int count, uint32_t generated) {
  int32_t meta[3];
  if (persist_read_data(20, meta, sizeof(meta)) != sizeof(meta) || (uint32_t)meta[0] != generated ||
      meta[1] < 0 || meta[1] > MAP_LAND_MAX || meta[2] != count || count > PASS_MAX) return;
  if (!read_bytes(21, s_land, meta[1]) || !read_bytes(31, s_tracks, count * MAP_TRACK_BYTES)) return;
  s_land_len = meta[1];
  if (!valid_land()) { s_land_len = 0; return; }
  s_track_count = count;
  persist_read_string(40, s_location, sizeof(s_location));
}

void map_receive(DictionaryIterator *it, int count, uint32_t generated) {
  s_track_count = 0; s_land_len = 0; s_location[0] = '\0';
  persist_delete(20);
  Tuple *land = dict_find(it, MESSAGE_KEY_MAP_LAND);
  Tuple *tracks = dict_find(it, MESSAGE_KEY_MAP_TRACKS);
  Tuple *location = dict_find(it, MESSAGE_KEY_MAP_LOCATION);
  if (!land || !tracks || land->length > MAP_LAND_MAX || tracks->length != count * MAP_TRACK_BYTES) return;
  memcpy(s_land, land->value->data, land->length);
  s_land_len = land->length;
  if (!valid_land()) { s_land_len = 0; return; }
  memcpy(s_tracks, tracks->value->data, tracks->length);
  s_track_count = count;
  if (location) snprintf(s_location, sizeof(s_location), "%s", location->value->cstring);
  // Commit metadata last; a partial write must not make a new map look valid.
  if (!persist_bytes(21, s_land, s_land_len) || !persist_bytes(31, s_tracks, tracks->length) ||
      persist_write_string(40, s_location) < 0) return;
  int32_t meta[] = {(int32_t)generated, s_land_len, count};
  persist_write_data(20, meta, sizeof(meta));
}

const char *map_location(void) { return s_location; }

static int signed16(const uint8_t *p) { return (int16_t)(p[0] | p[1] << 8); }
static GPoint point(int x, int y) { return GPoint(96 + x * 192 / 800, 60 - y * 192 / 800); }

static void polygon(GContext *ctx, GPoint *points, int count, GColor fill) {
  if (count < 3) return;
  GPathInfo info = {.num_points = count, .points = points};
  GPath *path = gpath_create(&info);
  if (!path) return;
  graphics_context_set_fill_color(ctx, fill);
  gpath_draw_filled(ctx, path);
  gpath_destroy(path);
}

void map_draw(GContext *ctx, int selected, uint8_t flags) {
  graphics_context_set_fill_color(ctx, GColorOxfordBlue);
  graphics_fill_rect(ctx, GRect(0, 0, 192, 120), 0, GCornerNone);
  int n = 0;
  for (int i = 0; i < s_land_len; i += 2) {
    if (s_land[i] == 255) { polygon(ctx, s_points, n, GColorDarkGreen); n = 0; }
    else s_points[n++] = GPoint(s_land[i], s_land[i + 1]);
  }
  graphics_context_set_stroke_color(ctx, GColorDarkGray);
  for (int x = 48; x < 192; x += 48) graphics_draw_line(ctx, GPoint(x, 0), GPoint(x, 119));
  for (int y = 12; y < 120; y += 48) graphics_draw_line(ctx, GPoint(0, y), GPoint(191, y));

  bool available = selected >= 0 && selected < s_track_count;
  const uint8_t *r = available ? s_tracks + selected * MAP_TRACK_BYTES : s_tracks;
  int ax = signed16(r), ay = signed16(r + 2), bx = signed16(r + 4), by = signed16(r + 6);
  int nx = signed16(r + 8), ny = signed16(r + 10);
  available = available && (nx || ny);
  if (available) {
    GPoint corners[] = {point(ax + nx, ay + ny), point(bx + nx, by + ny),
                        point(bx - nx, by - ny), point(ax - nx, ay - ny)};
    // Stipple the nominal swath, retaining the geographic land/water beneath it.
    for (int y = 0; y < 120; y += 3) {
      for (int x = (y % 2); x < 192; x += 3) {
        int east = (x - 96) * 800 / 192, north = (60 - y) * 800 / 192;
        int64_t side = (int64_t)(east - ax) * nx + (int64_t)(north - ay) * ny;
        int64_t width = (int64_t)nx * nx + (int64_t)ny * ny;
        if (side >= -width && side <= width) {
          graphics_context_set_stroke_color(ctx, GColorCadetBlue);
          graphics_draw_pixel(ctx, GPoint(x, y));
        }
      }
    }
    graphics_context_set_stroke_color(ctx, flags ? GColorChromeYellow : GColorCyan);
    graphics_draw_line(ctx, corners[0], corners[1]);
    graphics_draw_line(ctx, corners[3], corners[2]);
    graphics_context_set_stroke_color(ctx, GColorWhite);
    graphics_context_set_stroke_width(ctx, 2);
    graphics_draw_line(ctx, point(ax, ay), point(bx, by));
    graphics_context_set_stroke_width(ctx, 1);
  }
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_circle(ctx, GPoint(96, 60), 6);
  graphics_context_set_fill_color(ctx, GColorChromeYellow);
  graphics_fill_circle(ctx, GPoint(96, 60), 3);
  graphics_context_set_text_color(ctx, GColorWhite);
  GFont font = fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD);
  graphics_draw_text(ctx, "N", font, GRect(5, 0, 15, 16), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, GRect(89, 0, 103, 16), 0, GCornerNone);
  graphics_draw_text(ctx, s_location, font, GRect(25, 0, 162, 16), GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
  graphics_context_set_stroke_color(ctx, GColorWhite);
  graphics_draw_line(ctx, GPoint(8, 105), GPoint(32, 105));
  graphics_draw_line(ctx, GPoint(8, 102), GPoint(8, 107));
  graphics_draw_line(ctx, GPoint(32, 102), GPoint(32, 107));
  graphics_draw_text(ctx, "100 km", font, GRect(6, 107, 50, 14), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, GRect(105, 52, 30, 16), 0, GCornerNone);
  graphics_draw_text(ctx, "YOU", font, GRect(107, 51, 28, 16), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  if (!available) {
    graphics_context_set_fill_color(ctx, GColorBlack);
    graphics_fill_rect(ctx, GRect(15, 22, 162, 20), 0, GCornerNone);
    graphics_draw_text(ctx, "MAP UNAVAILABLE", font, GRect(15, 23, 162, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
  }
}
