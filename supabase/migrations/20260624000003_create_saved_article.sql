CREATE TABLE "saved_article" (
    "id"           UUID                            NOT NULL DEFAULT gen_random_uuid(),
    "saved_date"   TIMESTAMP(0) WITHOUT TIME ZONE  NOT NULL DEFAULT now(),
    "published_at" TIMESTAMP(0) WITH TIME ZONE     NOT NULL,
    "article_id"   VARCHAR(255)                    NOT NULL,
    "source"       VARCHAR(255)                    NOT NULL,
    "title"        VARCHAR(255)                    NOT NULL,
    "description"  TEXT                            NULL,
    "article_url"  TEXT                            NOT NULL,
    "image_url"    TEXT                            NULL,
    "user_id"      UUID                            NOT NULL
);

ALTER TABLE "saved_article" ADD PRIMARY KEY ("id");
ALTER TABLE "saved_article" ADD CONSTRAINT "saved_article_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id");
ALTER TABLE "saved_article" ADD CONSTRAINT "saved_article_user_article_unique" UNIQUE ("user_id", "article_id");
