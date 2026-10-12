import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/i/",
        "/response/",
        "/dashboard",
        "/create",
        "/api/",
        "/auth",
      ],
    },
  };
}
