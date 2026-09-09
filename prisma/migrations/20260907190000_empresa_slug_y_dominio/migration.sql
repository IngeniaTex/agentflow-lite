-- Empresa identificable en el chat público: /chat/<slug> o por dominio propio.
--
-- `slug` es obligatorio, así que no basta con añadir la columna: hay que
-- rellenar las filas existentes antes de exigir NOT NULL y el índice único.

-- 1. Columnas nuevas; slug entra nullable para poder rellenarlo.
ALTER TABLE "companies" ADD COLUMN "slug" TEXT;
ALTER TABLE "companies" ADD COLUMN "chatDomain" TEXT;

-- 2. Slug a partir del nombre: sin acentos, minúsculas, lo no alfanumérico a guion.
UPDATE "companies"
SET "slug" = NULLIF(
  trim(BOTH '-' FROM regexp_replace(
    lower(translate("name",
      'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
    '[^a-z0-9]+', '-', 'g')),
  '');

-- 3. Respaldo si el nombre no dejó nada usable (por ejemplo, solo símbolos).
UPDATE "companies" SET "slug" = "id" WHERE "slug" IS NULL;

-- 4. Desempate si dos empresas comparten nombre.
UPDATE "companies" c
SET "slug" = c."slug" || '-' || substr(c."id", 1, 6)
WHERE EXISTS (
  SELECT 1 FROM "companies" o WHERE o."slug" = c."slug" AND o."id" <> c."id"
);

-- 5. Ya se puede exigir.
ALTER TABLE "companies" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE UNIQUE INDEX "companies_chatDomain_key" ON "companies"("chatDomain");
