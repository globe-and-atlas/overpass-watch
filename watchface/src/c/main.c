// Overpass: when do Landsat 8/9 and Sentinel-2 next image where I'm standing, how cloudy, and one
// button to drop a ground-truth pin. The phone predicts (src/pkjs); the watch shows and pins.
//   UP / DOWN     select a pass
//   SELECT        drop a ground-truth pin (saved on the phone, tagged with the nearest pass)
//   long SELECT   refresh predictions
#include <pebble.h>

#include "passes.h"

#define AMBER GColorChromeYellow
#define LIST_ROWS 4
#define STATUS_MS 8000
#define CMD_REFRESH 1
#define CMD_PIN 2

// Persisted so the last predictions show without the phone. Persist values max out at 256 bytes.
#define PERSIST_META 1  // {count, generated}
#define PERSIST_DATA 2  // PASS_BYTES * PASS_MAX bytes over consecutive keys, 200 bytes each
#define PERSIST_CHUNK 200

static Window *s_window;
static Layer *s_canvas;
static GFont s_f14, s_f18, s_f24, s_f28;

static Pass s_passes[PASS_MAX];
static int s_count;
static uint32_t s_generated;
static int s_sel;
static bool s_auto = true;  // selection follows the next pass until the user moves it
static int s_pins;
static char s_status[32];
static AppTimer *s_status_timer;

// ---- data ---------------------------------------------------------------------------------

static void persist_passes(const uint8_t *data, int len) {
  int32_t meta[2] = {len / PASS_BYTES, (int32_t)s_generated};
  persist_write_data(PERSIST_META, meta, sizeof(meta));
  for (int off = 0, key = PERSIST_DATA; off < len; off += PERSIST_CHUNK, key++) {
    int n = len - off < PERSIST_CHUNK ? len - off : PERSIST_CHUNK;
    persist_write_data(key, data + off, n);
  }
}

static void restore_passes(void) {
  int32_t meta[2];
  if (persist_read_data(PERSIST_META, meta, sizeof(meta)) != sizeof(meta)) return;
  int len = meta[0] * PASS_BYTES;
  if (len <= 0 || len > PASS_MAX * PASS_BYTES) return;
  static uint8_t buf[PASS_MAX * PASS_BYTES];
  for (int off = 0, key = PERSIST_DATA; off < len; off += PERSIST_CHUNK, key++) {
    int n = len - off < PERSIST_CHUNK ? len - off : PERSIST_CHUNK;
    if (persist_read_data(key, buf + off, n) != n) return;
  }
  s_count = passes_parse(buf, len, s_passes, PASS_MAX);
  s_generated = (uint32_t)meta[1];
}

static void follow_next(void) {
  if (!s_auto) return;
  int next = passes_next(s_passes, s_count, (uint32_t)time(NULL));
  s_sel = next < s_count ? next : (s_count ? s_count - 1 : 0);
}

static void clear_status(void *ctx) {
  s_status_timer = NULL;
  s_status[0] = '\0';
  layer_mark_dirty(s_canvas);
}

static void set_status(const char *text) {
  snprintf(s_status, sizeof(s_status), "%s", text);
  if (s_status_timer) app_timer_cancel(s_status_timer);
  s_status_timer = s_status[0] ? app_timer_register(STATUS_MS, clear_status, NULL) : NULL;
  layer_mark_dirty(s_canvas);
}

static void send_cmd(int cmd, const char *pending) {
  DictionaryIterator *it;
  if (app_message_outbox_begin(&it) != APP_MSG_OK) {
    set_status("PHONE BUSY");
    return;
  }
  dict_write_int32(it, MESSAGE_KEY_CMD, cmd);
  if (app_message_outbox_send() == APP_MSG_OK) {
    set_status(pending);
  } else {
    set_status("NO PHONE");
  }
}

static void on_inbox(DictionaryIterator *it, void *ctx) {
  Tuple *t;
  if ((t = dict_find(it, MESSAGE_KEY_GENERATED))) s_generated = (uint32_t)t->value->int32;
  if ((t = dict_find(it, MESSAGE_KEY_PASSES))) {
    s_count = passes_parse(t->value->data, t->length, s_passes, PASS_MAX);
    persist_passes(t->value->data, s_count * PASS_BYTES);
    s_auto = true;
    follow_next();
  }
  if ((t = dict_find(it, MESSAGE_KEY_PINS))) s_pins = t->value->int32;
  if ((t = dict_find(it, MESSAGE_KEY_STATUS))) set_status(t->value->cstring);
  layer_mark_dirty(s_canvas);
}

static void on_outbox_failed(DictionaryIterator *it, AppMessageResult reason, void *ctx) {
  set_status("NO PHONE");
}

// ---- render -------------------------------------------------------------------------------

static void text(GContext *ctx, const char *s, GFont f, GRect r, GColor c, GTextAlignment a) {
  graphics_context_set_text_color(ctx, c);
  graphics_draw_text(ctx, s, f, r, GTextOverflowModeTrailingEllipsis, a, NULL);
}

static void draw_hero(GContext *ctx, const Pass *p, uint32_t now) {
  char buf[32];
  text(ctx, passes_platform_name(p->platform), s_f24, GRect(4, 16, 192, 28), GColorWhite, GTextAlignmentLeft);

  passes_countdown((int32_t)(p->time - now), buf, sizeof(buf));
  text(ctx, buf, s_f28, GRect(4, 42, 192, 32), GColorCyan, GTextAlignmentLeft);

  time_t t = p->time;
  strftime(buf, sizeof(buf), clock_is_24h_style() ? "%a %d %b  %H:%M" : "%a %d %b  %I:%M %p", localtime(&t));
  text(ctx, buf, s_f18, GRect(4, 76, 192, 22), GColorWhite, GTextAlignmentLeft);

  char cloud[12];
  if (p->cloud >= 0) snprintf(cloud, sizeof(cloud), "%d%%", p->cloud);
  else snprintf(cloud, sizeof(cloud), "--");
  snprintf(buf, sizeof(buf), "%d KM OFF TRACK  CLOUD %s", p->dist10 / 10, cloud);
  text(ctx, buf, s_f14, GRect(4, 98, 192, 16), AMBER, GTextAlignmentLeft);

  const char *flag = "CERTAIN";
  GColor color = GColorCyan;
  if ((p->flags & PASS_EDGE) && (p->flags & PASS_PARTIAL)) {
    flag = "EDGE - MAY NOT ACQUIRE";
    color = GColorOrange;
  } else if (p->flags & PASS_PARTIAL) {
    flag = "MAY NOT ACQUIRE (S2A PLAN)";
    color = GColorOrange;
  } else if (p->flags & PASS_EDGE) {
    flag = "EDGE - MAY MISS YOU";
    color = GColorLiberty;
  }
  text(ctx, flag, s_f14, GRect(4, 113, 192, 16), color, GTextAlignmentLeft);
}

static void draw_list(GContext *ctx) {
  int first = s_sel - 1;
  if (first > s_count - LIST_ROWS) first = s_count - LIST_ROWS;
  if (first < 0) first = 0;
  for (int row = 0; row < LIST_ROWS && first + row < s_count; row++) {
    int i = first + row;
    const Pass *p = &s_passes[i];
    GRect r = GRect(2, 136 + row * 17, 196, 17);
    if (i == s_sel) {
      graphics_context_set_fill_color(ctx, GColorDarkGray);
      graphics_fill_rect(ctx, r, 2, GCornersAll);
    }
    char when[20], line[40], cloud[8];
    time_t t = p->time;
    strftime(when, sizeof(when), clock_is_24h_style() ? "%d %b %H:%M" : "%d %b %I:%M%p", localtime(&t));
    if (p->cloud >= 0) snprintf(cloud, sizeof(cloud), "%d%%", p->cloud);
    else snprintf(cloud, sizeof(cloud), "--");
    snprintf(line, sizeof(line), "%-3s %s %s%s", passes_platform_short(p->platform), when, cloud,
             (p->flags & (PASS_EDGE | PASS_PARTIAL)) ? " ?" : "");
    text(ctx, line, s_f14, GRect(r.origin.x + 4, r.origin.y - 1, r.size.w - 8, 16),
         (p->flags & (PASS_EDGE | PASS_PARTIAL)) ? GColorLightGray : GColorWhite, GTextAlignmentLeft);
  }
}

static void canvas_update(Layer *layer, GContext *ctx) {
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
  uint32_t now = (uint32_t)time(NULL);

  char clock[8];
  time_t tn = now;
  strftime(clock, sizeof(clock), clock_is_24h_style() ? "%H:%M" : "%I:%M", localtime(&tn));
  text(ctx, "OVERPASS", s_f14, GRect(4, 0, 100, 16), AMBER, GTextAlignmentLeft);
  text(ctx, clock, s_f14, GRect(100, 0, 96, 16), GColorWhite, GTextAlignmentRight);

  if (s_count > 0) {
    draw_hero(ctx, &s_passes[s_sel], now);
    graphics_context_set_stroke_color(ctx, GColorDarkGray);
    graphics_draw_line(ctx, GPoint(4, 132), GPoint(196, 132));
    draw_list(ctx);
  } else {
    text(ctx, "NO PASSES YET", s_f24, GRect(4, 70, 192, 28), GColorWhite, GTextAlignmentCenter);
    text(ctx, "HOLD SELECT TO REFRESH", s_f14, GRect(4, 100, 192, 16), GColorLightGray, GTextAlignmentCenter);
  }

  char foot[40];
  if (s_status[0]) {
    snprintf(foot, sizeof(foot), "%s", s_status);
  } else {
    int age_h = s_generated ? (int)((now - s_generated) / 3600) : -1;
    snprintf(foot, sizeof(foot), age_h > 12 ? "PINS %d  DATA %dH OLD" : "PINS %d  SELECT = PIN", s_pins, age_h);
  }
  text(ctx, foot, s_f14, GRect(4, 208, 192, 16), s_status[0] ? AMBER : GColorLightGray, GTextAlignmentLeft);
}

// ---- input --------------------------------------------------------------------------------

static void up(ClickRecognizerRef r, void *ctx) {
  if (s_sel > 0) s_sel--;
  s_auto = false;
  layer_mark_dirty(s_canvas);
}

static void down(ClickRecognizerRef r, void *ctx) {
  if (s_sel < s_count - 1) s_sel++;
  s_auto = false;
  layer_mark_dirty(s_canvas);
}

static void select_click(ClickRecognizerRef r, void *ctx) {
  vibes_short_pulse();
  send_cmd(CMD_PIN, "PINNING...");
}

static void select_long(ClickRecognizerRef r, void *ctx) {
  send_cmd(CMD_REFRESH, "REFRESHING...");
}

static void click_config(void *ctx) {
  window_single_click_subscribe(BUTTON_ID_UP, up);
  window_single_click_subscribe(BUTTON_ID_DOWN, down);
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click);
  window_long_click_subscribe(BUTTON_ID_SELECT, 700, select_long, NULL);
}

static void on_tick(struct tm *t, TimeUnits changed) {
  follow_next();
  layer_mark_dirty(s_canvas);
}

// ---- lifecycle ----------------------------------------------------------------------------

static void window_load(Window *w) {
  Layer *root = window_get_root_layer(w);
  s_canvas = layer_create(layer_get_bounds(root));
  layer_set_update_proc(s_canvas, canvas_update);
  layer_add_child(root, s_canvas);
}

static void window_unload(Window *w) {
  layer_destroy(s_canvas);
}

static void init(void) {
  s_f14 = fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD);
  s_f18 = fonts_get_system_font(FONT_KEY_GOTHIC_18);
  s_f24 = fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
  s_f28 = fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
  restore_passes();
  follow_next();

  s_window = window_create();
  window_set_background_color(s_window, GColorBlack);
  window_set_click_config_provider(s_window, click_config);
  window_set_window_handlers(s_window, (WindowHandlers){.load = window_load, .unload = window_unload});
  window_stack_push(s_window, true);

  tick_timer_service_subscribe(MINUTE_UNIT, on_tick);
  app_message_register_inbox_received(on_inbox);
  app_message_register_outbox_failed(on_outbox_failed);
  app_message_open(1024, 64);
}

static void deinit(void) {
  tick_timer_service_unsubscribe();
  window_destroy(s_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
