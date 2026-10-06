import QRCode from "qrcode";
import GalaLoader from "./GalaLoader";
import { deck } from "./deck";

// Guests scan this from the screen; it opens the upload page on their phone.
const UPLOAD_URL = "https://porunhialeahmejor.com/foto";

export default async function GalaPage() {
  const qrSvg = await QRCode.toString(UPLOAD_URL, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#2a1a0c", light: "#0000" },
  });

  return <GalaLoader deck={deck} qrSvg={qrSvg} uploadLabel="porunhialeahmejor.com/foto" />;
}
