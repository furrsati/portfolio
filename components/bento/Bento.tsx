"use client";

import AgentsTile from "./tiles/AgentsTile";
import CutoverTile from "./tiles/CutoverTile";
import EscrowTile from "./tiles/EscrowTile";
import BookingTile from "./tiles/BookingTile";
import RealtimeTile from "./tiles/RealtimeTile";
import RtlTile from "./tiles/RtlTile";
import ShipTile from "./tiles/ShipTile";
import TriviaTile from "./tiles/TriviaTile";

export default function Bento() {
  return (
    <section id="skills" aria-labelledby="skills-title" className="relative px-5 py-28 md:px-10 lg:px-16 lg:py-40">
      <div className="mx-auto max-w-[1500px]">
        <h2
          id="skills-title"
          className="max-w-[14ch] text-[clamp(2.75rem,6.5vw,6rem)] font-semibold leading-[0.95] tracking-[-0.035em] [font-variation-settings:'wdth'_80,'opsz'_96]"
        >
          What I do best, working.
        </h2>
        <p className="mt-6 max-w-[52ch] text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.5] text-text-2">
          Every tile is a working piece of a real product. Drag it, type in it, flip it, try to break it.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12 lg:auto-rows-[minmax(300px,auto)]">
          <EscrowTile className="md:col-span-6 lg:col-span-7 lg:row-span-2" />
          <AgentsTile className="md:col-span-6 lg:col-span-5 lg:row-span-2" />
          <RtlTile className="md:col-span-3 lg:col-span-4" />
          <TriviaTile className="md:col-span-3 lg:col-span-4" />
          <BookingTile className="md:col-span-6 lg:col-span-4" />
          <CutoverTile className="md:col-span-6 lg:col-span-6" />
          <RealtimeTile className="md:col-span-3 lg:col-span-3" />
          <ShipTile className="md:col-span-3 lg:col-span-3" />
        </div>
      </div>
    </section>
  );
}
