| final_structure_definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE OR REPLACE FUNCTION public.increment_total_post_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.profiles
  set total_post_count = total_post_count + 1
  where id = new.user_id;
  return new;
end;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| CREATE OR REPLACE FUNCTION public.delete_own_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- auth.usersテーブルから自分のIDを削除
  -- (これを消すと、CASCADE設定によりprofilesやlettersも自動で消えるはずです)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| CREATE OR REPLACE FUNCTION public.increment_stamp_count(_user_id uuid, _stamp_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO user_stamps (user_id, stamp_id, count, last_obtained_at)
  VALUES (_user_id, _stamp_id, 1, NOW())
  ON CONFLICT (user_id, stamp_id)
  DO UPDATE SET 
    count = user_stamps.count + 1,
    last_obtained_at = NOW();
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, nickname, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| CREATE OR REPLACE FUNCTION public.check_daily_letter_limit()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- SECURITY DEFINERによりRLSをバイパスして数えるため、無限ループが起きません
  RETURN NOT EXISTS (
    SELECT 1 FROM public.letters
    WHERE user_id = auth.uid()
    AND created_at > (now() - interval '24 hours')
  );
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| CREATE OR REPLACE FUNCTION public.deposit_memory_trace()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- A. 手紙（letters）が新しく投稿された時の処理
    IF (TG_TABLE_NAME = 'letters') THEN
        -- 投稿者本人の跡を保存（NEWレコードの値を直接使うことでエラーを回避）
        INSERT INTO public.memory_traces (user_id, lat, lng, is_thread)
        VALUES (NEW.user_id, NEW.lat, NEW.lng, (NEW.parent_id IS NOT NULL));

        -- 「返信」だった場合のみ、誰にも紐付かない「街の光」も追加（公的）
        IF (NEW.parent_id IS NOT NULL) THEN
            INSERT INTO public.memory_traces (user_id, lat, lng, is_thread)
            VALUES (NULL, NEW.lat, NEW.lng, true);
        END IF;

    -- B. 手紙が読まれた（letter_reads）時の処理
    ELSIF (TG_TABLE_NAME = 'letter_reads') THEN
        -- 手紙の座標を letters テーブルから引っ張ってきて跡を残す
        INSERT INTO public.memory_traces (user_id, lat, lng, is_thread)
        SELECT NEW.user_id, l.lat, l.lng, (l.parent_id IS NOT NULL)
        FROM public.letters l WHERE l.id = NEW.letter_id;
    END IF;

    RETURN NEW;
END;
$function$
; |
| CREATE OR REPLACE FUNCTION public.get_email_from_nickname(input_nickname text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  found_email text;
begin
  select email into found_email from public.profiles where nickname = input_nickname;
  return found_email;
end;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |