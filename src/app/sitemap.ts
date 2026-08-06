import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://cluedeo.vercel.app";

  const routes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/aboutus", priority: 0.7, changeFrequency: "monthly" },
    { path: "/chat", priority: 0.8, changeFrequency: "weekly" },
    { path: "/leads/comment-generator", priority: 0.8, changeFrequency: "weekly" },
    { path: "/new", priority: 0.6, changeFrequency: "weekly" },
    { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}