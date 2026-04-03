-- Creates the test database if it doesn't exist
SELECT 'CREATE DATABASE family_chat_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'family_chat_test')\gexec
