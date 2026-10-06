"use client";

import dynamic from "next/dynamic";

// The slideshow reads the URL and the screen size from its first render, and
// a projector has no use for server HTML — so it renders on the client only.
const Slideshow = dynamic(() => import("./Slideshow"), { ssr: false });

export default Slideshow;
