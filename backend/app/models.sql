CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  release_year INT
);

CREATE TABLE IF NOT EXISTS genres (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
  genre_id INT REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, genre_id)
);

INSERT INTO movies (title, release_year) VALUES
('Inception', 2010),
('The Dark Knight', 2008),
('Interstellar', 2014)
ON CONFLICT DO NOTHING;

INSERT INTO genres (name) VALUES
('Action'), ('Sci-Fi'), ('Drama')
ON CONFLICT DO NOTHING;

INSERT INTO movie_genres VALUES
(1, 2), (1, 3), (2, 1), (3, 2), (3, 3)
ON CONFLICT DO NOTHING;
