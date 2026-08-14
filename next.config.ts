import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next infiera un workspace root equivocado si hay lockfiles arriba.
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // El build de producción no debe fallar por reglas de estilo en el template.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
