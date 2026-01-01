| fk_definition                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------- |
| ALTER TABLE public.letters ADD CONSTRAINT letters_attached_stamp_id_fkey FOREIGN KEY (attached_stamp_id) REFERENCES stamps(id);              |
| ALTER TABLE public.letters ADD CONSTRAINT letters_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES letters(id) ON DELETE CASCADE;           |
| ALTER TABLE public.letters ADD CONSTRAINT letters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;            |
| ALTER TABLE public.favorites ADD CONSTRAINT favorites_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE;       |
| ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;        |
| ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;                    |
| ALTER TABLE public.reports ADD CONSTRAINT reports_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE;           |
| ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id);                      |
| ALTER TABLE public.user_stamps ADD CONSTRAINT user_stamps_post_id_fkey FOREIGN KEY (post_id) REFERENCES letters(id);                         |
| ALTER TABLE public.user_stamps ADD CONSTRAINT user_stamps_stamp_id_fkey FOREIGN KEY (stamp_id) REFERENCES stamps(id);                        |
| ALTER TABLE public.user_stamps ADD CONSTRAINT user_stamps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;    |
| ALTER TABLE public.post_logs ADD CONSTRAINT post_logs_post_id_fkey FOREIGN KEY (post_id) REFERENCES letters(id) ON DELETE CASCADE;           |
| ALTER TABLE public.post_logs ADD CONSTRAINT post_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;        |
| ALTER TABLE public.letter_reads ADD CONSTRAINT letter_reads_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE; |
| ALTER TABLE public.letter_reads ADD CONSTRAINT letter_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;  |