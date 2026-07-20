import "./globals.css";

export const metadata = {
  title: "Oasis AI: Food Sustainability",
  description: "Sustainable surplus food distribution for Dubai AI Week",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
