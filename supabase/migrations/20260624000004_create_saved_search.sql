CREATE TABLE "saved_search" (
    "id"         UUID                            NOT NULL DEFAULT gen_random_uuid(),
    "saved_date" TIMESTAMP(0) WITHOUT TIME ZONE  NOT NULL DEFAULT now(),
    "date_from"  DATE                            NULL,
    "date_to"    DATE                            NULL,
    "user_id"    UUID                            NOT NULL,
    "keywords"   TEXT                            NOT NULL
);

ALTER TABLE "saved_search" ADD PRIMARY KEY ("id");
ALTER TABLE "saved_search" ADD CONSTRAINT "saved_search_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id");
