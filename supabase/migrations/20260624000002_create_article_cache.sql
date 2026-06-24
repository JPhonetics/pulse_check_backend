CREATE TABLE "article_cache" (
    "article_id"   VARCHAR(255)                        NOT NULL,
    "fetched_at"   TIMESTAMP(0) WITHOUT TIME ZONE      NOT NULL DEFAULT now(),
    "published_at" TIMESTAMP(0) WITH TIME ZONE         NOT NULL,
    "source"       VARCHAR(255)                        NOT NULL,
    "title"        VARCHAR(255)                        NOT NULL,
    "description"  TEXT                                NULL,
    "article_url"  TEXT                                NOT NULL,
    "image_url"    TEXT                                NULL,
    "country"      VARCHAR(255)                        NULL,
    "category"     VARCHAR(255)                        NULL
);

ALTER TABLE "article_cache" ADD PRIMARY KEY ("article_id");

-- Composite index for browse/filter queries (country + category + newest-first)
CREATE INDEX ON "article_cache" ("country", "category", "published_at" DESC);

-- Index for freshness check (newest fetched_at per country/category combination)
CREATE INDEX ON "article_cache" ("country", "category", "fetched_at" DESC);
