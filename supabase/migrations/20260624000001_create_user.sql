CREATE TABLE "user" (
    "id"            UUID                        NOT NULL DEFAULT gen_random_uuid(),
    "created_date"  TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    "modified_date" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    "first_name"    VARCHAR(255)                NOT NULL,
    "email"         VARCHAR(255)                NOT NULL,
    "password"      VARCHAR(255)                NOT NULL,
    "local_state"   VARCHAR(255)                NULL,
    "local_city"    VARCHAR(255)                NULL
);

ALTER TABLE "user" ADD PRIMARY KEY ("id");
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE ("email");
