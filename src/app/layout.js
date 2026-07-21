import "./globals.css";

export const metadata = {
  title: "FoodBridge Monitor",
  description: "FoodBridge Monitor: an Amsterdam surplus-food redistribution pilot, built for Dubai AI Week",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
