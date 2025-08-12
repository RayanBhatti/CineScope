-- Minimal demo data
INSERT INTO movies (title, release_year) VALUES
('Inception', 2010),
('The Dark Knight', 2008),
('Interstellar', 2014)
ON CONFLICT DO NOTHING;

INSERT INTO genres (name) VALUES
('Action'), ('Sci-Fi'), ('Drama')
ON CONFLICT DO NOTHING;

INSERT INTO movie_genres (movie_id, genre_id) VALUES
(1, (SELECT id FROM genres WHERE name='Sci-Fi')),
(1, (SELECT id FROM genres WHERE name='Drama')),
(2, (SELECT id FROM genres WHERE name='Action')),
(3, (SELECT id FROM genres WHERE name='Sci-Fi')),
(3, (SELECT id FROM genres WHERE name='Drama'))
ON CONFLICT DO NOTHING;
