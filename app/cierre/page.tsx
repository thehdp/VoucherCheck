import Cierre from "./cierre";

export const viewport = { width: "device-width", initialScale: 1 };
export const metadata = { title: "Cierre de mes", robots: { index: false, follow: false } };

export default function Page() {
  return <Cierre />;
}
