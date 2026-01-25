import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next";

const Logo = () => (
  <a href="https://taxbuddy.online/">
    <img
      src="/images/20260125-logo2-cropped-transparent.png"
      alt="TaxBuddy"
      className="h-12"
    />
  </a>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>TaxBuddy Chat</title>
        <link rel="shortcut icon" href="/images/20260125-logo2-georgia5c5c99.ico" />
        <meta
          name="description"
          content="TaxBuddy is your Canadian tax research assistant"
        />
        <meta property="og:title" content="TaxBuddy" />
        <meta
          property="og:description"
          content="TaxBuddy is your Canadian tax research assistant"
        />
        <meta property="og:image" content="/images/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TaxBuddy" />
        <meta
          name="twitter:description"
          content="TaxBuddy is your Canadian tax research assistant"
        />
        <meta name="twitter:image" content="/images/og-image.png" />
      </head>
      <body style={{ fontFamily: 'Georgia, serif' }}>
        <NuqsAdapter>
          <div className="bg-secondary grid grid-rows-[auto,1fr] h-[100dvh]">
            <div className="p-4">
              <div className="flex gap-4 flex-col md:flex-row md:items-center">
                <Logo />
              </div>
            </div>
            <div className="bg-background mx-4 relative grid rounded-t-2xl border border-input border-b-0">
              <div className="absolute inset-0">{children}</div>
            </div>
          </div>
          <Toaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
