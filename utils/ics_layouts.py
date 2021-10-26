""" Create ICS layout files from tags. """

import sys
from pathlib import Path
from typing import Dict, List

import yaml


def main():
    """ Read tags and create matching ICS layouts. """
    my_parent_dir: Path = Path(__file__).parent.parent
    types_file: Path = my_parent_dir.joinpath("_data/types.yml")
    ics_layouts_dir: Path = my_parent_dir.joinpath("ics")

    with types_file.open("r") as tf:
        types = yaml.safe_load(tf)

    tags: List[str] = [t["tag"] for t in types]
    tags_and_files: Dict[str, Path] = {
        t: ics_layouts_dir.joinpath(f"{t}.ics") for t in tags
    }

    print(f"Found tags: {', '.join(tags)}")
    print(f"Will now proceed to write the following files under {ics_layouts_dir}:")
    print(f"  {', '.join([f.name for f in tags_and_files.values()])}")
    print("Use Ctrl-C to cancel, or press Enter to continue...")
    input()

    for tag, its_file in tags_and_files.items():
        with its_file.open("w") as its_f:
            its_f.write("---\n" f"tag_filter: {tag}\n" "layout: calendar\n" "---\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        # Exit code for Ctrl-C
        sys.exit(130)
else:
    raise ImportError
