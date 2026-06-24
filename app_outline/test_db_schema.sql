CREATE TABLE "article_cache"(
    "article_id" VARCHAR(255) NOT NULL,
    "fetched_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "published_at" TIMESTAMP(0) WITH
        TIME zone NOT NULL,
        "source" VARCHAR(255) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "article_url" TEXT NOT NULL,
        "image_url" TEXT NULL,
        "country" VARCHAR(255) NULL,
        "category" VARCHAR(255) NULL
);
ALTER TABLE
    "article_cache" ADD PRIMARY KEY("article_id");
CREATE TABLE "saved_search"(
    "id" UUID NOT NULL,
    "saved_date" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "date_from" DATE NULL,
    "date_to" DATE NULL,
    "user_id" UUID NOT NULL,
    "keywords" TEXT NOT NULL
);
ALTER TABLE
    "saved_search" ADD PRIMARY KEY("id");
CREATE TABLE "saved_article"(
    "id" UUID NOT NULL,
    "saved_date" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "published_at" TIMESTAMP(0) WITH
        TIME zone NOT NULL,
        "article_id" VARCHAR(255) NOT NULL,
        "source" VARCHAR(255) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "article_url" TEXT NOT NULL,
        "image_url" TEXT NULL,
        "user_id" UUID NOT NULL
);
ALTER TABLE
    "saved_article" ADD PRIMARY KEY("id");
CREATE TABLE "user"(
    "id" UUID NOT NULL,
    "created_date" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "modified_date" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "local_state" VARCHAR(255) NULL,
    "local_city" VARCHAR(255) NULL,
    "local_zip" VARCHAR(255) NULL
);
ALTER TABLE
    "user" ADD PRIMARY KEY("id");
ALTER TABLE
    "saved_article" ADD CONSTRAINT "saved_article_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");
ALTER TABLE
    "saved_search" ADD CONSTRAINT "saved_search_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");