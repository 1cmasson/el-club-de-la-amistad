import QRCode from "qrcode";
import styles from "./Tarjeta.module.css";

// Table cards for the gala: print on letter paper, cut into four, set one on
// each table — guests can scan without craning toward the projector.
const UPLOAD_URL = "https://porunhialeahmejor.com/foto";

export const metadata = { title: "Tarjetas de mesa" };

export default async function TarjetaPage() {
  const qrSvg = await QRCode.toString(UPLOAD_URL, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#2a1a0c", light: "#0000" },
  });

  return (
    <div className={styles.sheet}>
      {Array.from({ length: 4 }, (_, i) => (
        <section key={i} className={styles.card}>
          {/* eslint-disable-next-line @next/next/no-img-element -- print sheet */}
          <img className={styles.seal} src="/assets/seal.webp" alt="" />
          <h1 className={styles.title}>Comparte tu foto</h1>
          <p className={styles.sub}>¡y aparece en la pantalla de la Gala!</p>
          <div className={styles.qr} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className={styles.how}>Abre la cámara de tu teléfono y apunta al código</p>
          <p className={styles.en}>Scan with your phone camera to share your photo on the big screen</p>
          <p className={styles.url}>porunhialeahmejor.com/foto</p>
        </section>
      ))}
    </div>
  );
}
