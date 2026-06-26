-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.user (
  id uuid NOT NULL,
  created_date timestamp without time zone NOT NULL DEFAULT now(),
  modified_date timestamp without time zone NOT NULL DEFAULT now(),
  first_name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  local_state character varying,
  local_city character varying,
  CONSTRAINT user_pkey PRIMARY KEY (id),
  CONSTRAINT user_auth_id_fk FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.article_cache (
  article_id character varying NOT NULL,
  fetched_at timestamp without time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone NOT NULL,
  source character varying NOT NULL,
  title character varying NOT NULL,
  description text,
  article_url text NOT NULL,
  image_url text,
  country character varying,
  category character varying,
  group_key text,
  CONSTRAINT article_cache_pkey PRIMARY KEY (article_id)
);
CREATE TABLE public.saved_article (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  saved_date timestamp without time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone NOT NULL,
  article_id character varying NOT NULL,
  source character varying NOT NULL,
  title character varying NOT NULL,
  description text,
  article_url text NOT NULL,
  image_url text,
  user_id uuid NOT NULL,
  CONSTRAINT saved_article_pkey PRIMARY KEY (id),
  CONSTRAINT saved_article_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.user(id)
);
CREATE TABLE public.saved_search (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  saved_date timestamp without time zone NOT NULL DEFAULT now(),
  date_from date,
  date_to date,
  user_id uuid NOT NULL,
  keywords text NOT NULL,
  CONSTRAINT saved_search_pkey PRIMARY KEY (id),
  CONSTRAINT saved_search_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.user(id)
);