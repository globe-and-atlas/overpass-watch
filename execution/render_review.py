"""Capture current Overpass UI using the already running emulator."""
import json
import time

import emulator_check as em


def main():
    original = em.DEV.read_text()
    try:
        em.DEV.write_text(json.dumps(em.FIXTURE) + "\n")
        result = em.run(["pebble", "build"])
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)
        for attempt in range(2):
            result = em.run(["pebble", "install", "--emulator", "emery", "build/watchface.pbw"])
            print(result.stdout, flush=True)
            time.sleep(20)
        em.shot("review_1_list")
        em.run(["pebble", "emu-button", "--emulator", "emery", "click", "down"])
        time.sleep(1)
        em.shot("review_2_selected")
        em.run(["pebble", "emu-button", "--emulator", "emery", "click", "select"])
        time.sleep(3)
        em.shot("review_3_pin")
    finally:
        em.DEV.write_text(original)
        result = em.run(["pebble", "build"])
        print("Production rebuild exit:", result.returncode, flush=True)
    print("Renders:", em.OUT, flush=True)

if __name__ == "__main__":
    main()
