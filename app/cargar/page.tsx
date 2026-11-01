import Cargador from "./cargador";

export const viewport = { width: "device-width", initialScale: 1 };
export const metadata = { title: "Leer comprobante", robots: { index: false, follow: false } };

export default function Page() {
  return <Cargador />;
}
