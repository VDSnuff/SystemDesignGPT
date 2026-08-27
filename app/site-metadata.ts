import type { Metadata } from "next";

export const SITE_NAME = "System Design Studio";
export const SITE_ORIGIN = "https://system-design-studio.v-dovnich.chatgpt.site";

const SITE_DESCRIPTION = "An interactive, AI-guided system design handbook and diagram workshop.";
const SOCIAL_IMAGE = {
  url: "/og.png",
  width: 1731,
  height: 909,
  alt: "System Design Studio architecture map",
  type: "image/png",
} as const;

interface PageMetadataInput {
  readonly description: string;
  readonly isIndexable?: boolean;
  readonly path: string;
  readonly title: string;
}

function socialTitle(title: string) {
  return title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
}

export function createPageMetadata({
  description,
  isIndexable = true,
  path,
  title,
}: PageMetadataInput): Metadata {
  const fullTitle = socialTitle(title);
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: isIndexable, follow: isIndexable },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}

export const rootMetadata: Metadata = {
  ...createPageMetadata({ title: SITE_NAME, description: SITE_DESCRIPTION, path: "/" }),
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  icons: { icon: "/favicon.svg" },
};

export const notFoundMetadata: Metadata = {
  title: "Page not found",
  description: "The requested System Design Studio page does not exist.",
  robots: { index: false, follow: false },
};
