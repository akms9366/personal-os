import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 最小コストのVPS（ConoHa VPS 等）へのデプロイ向け。standalone は本番起動に必要な
  // ファイルだけを .next/standalone に出力するため、サーバー上で node_modules を
  // フルインストールする必要がなく、ディスク容量・デプロイの手間を抑えられる。
  output: "standalone",
};

export default nextConfig;
