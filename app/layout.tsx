import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next";
import { AccountButton } from "@/components/account/AccountButton";

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
          <div className="flex h-[100dvh]">
            {/* Sidebar strip - rendered by children */}
            <div className="flex-1 flex flex-col bg-secondary ml-12">
              <div className="p-4">
                <div className="flex gap-4 flex-col md:flex-row md:items-center justify-between">
                  <Logo />
                  <AccountButton />
                </div>
              </div>
              <div className="bg-background mx-4 relative grid rounded-t-2xl border border-input border-b-0 flex-1">
                <div className="absolute inset-0">{children}</div>
              </div>
            </div>
          </div>
          <Toaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
