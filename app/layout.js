import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StickySidebarAd from "@/components/StickySidebarAd";
import { getSetting, getActiveAd } from "@/lib/db";

export const metadata = {
  title: { default: "ורדית חביב | מתכונים מבית סבתא", template: "%s | ורדית חביב" },
  description:
    "מתכונים מבית סבתא — אתר המתכונים של ורדית חביב: מטבח תוניסאי-יהודי אותנטי, מתכונים ביתיים שעברו מדור לדור.",
};

export default function RootLayout({ children }) {
  const siteTitle = getSetting("site_title", "ורדית חביב");
  const subtitle = getSetting("site_subtitle", "מתכונים מבית סבתא");
  const headerAd = getActiveAd("header");
  const footerAd = getActiveAd("footer");

  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <SiteHeader siteTitle={siteTitle} subtitle={subtitle} />
        {headerAd ? (
          <div className="w-full bg-[var(--paper-deep)]/70 border-b border-[var(--line)]">
            <div
              className="mx-auto max-w-6xl px-4 py-2 ad-slot"
              dangerouslySetInnerHTML={{ __html: headerAd.html }}
            />
          </div>
        ) : (
          <div aria-hidden="true" />
        )}
        <div className="relative flex-1 w-full">
          <StickySidebarAd />
          <main className="mx-auto max-w-6xl px-4 py-6 w-full">{children}</main>
        </div>
        {footerAd ? (
          <div className="w-full bg-[var(--paper-deep)]/70 border-t border-[var(--line)]">
            <div
              className="mx-auto max-w-6xl px-4 py-2 ad-slot"
              dangerouslySetInnerHTML={{ __html: footerAd.html }}
            />
          </div>
        ) : (
          <div aria-hidden="true" />
        )}
        <SiteFooter siteTitle={siteTitle} />
      </body>
    </html>
  );
}
