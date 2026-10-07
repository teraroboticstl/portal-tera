-- Extend the existing admin-only atomic archive to OBR. Existing EXECUTE privileges remain unchanged.
BEGIN;
CREATE OR REPLACE FUNCTION public.close_season_atomic(
    p_season_tag TEXT,
    p_programs TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_tag TEXT;
    v_valid_programs TEXT[];
    v_logs_count INTEGER := 0;
    v_priorities_count INTEGER := 0;
    v_prototypes_count INTEGER := 0;
    v_meetings_count INTEGER := 0;
    v_total INTEGER := 0;
    v_user_name TEXT;
    v_user_email TEXT;
BEGIN
    -- 1. Validação de segurança: apenas administradores autorizados
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem encerrar e arquivar temporadas.';
    END IF;

    -- 2. Validação e sanitização da tag de temporada
    v_tag := TRIM(COALESCE(p_season_tag, ''));
    IF v_tag = '' THEN
        RAISE EXCEPTION 'O identificador da temporada (season_tag) não pode ser vazio.';
    END IF;

    -- 3. Validação estrita dos programas selecionados (apenas FRC, FTC, FLL permitidos)
    -- Se p_programs contiver QUALQUER elemento diferente de FRC, FTC ou FLL (incluindo valores inesperados ou nulos),
    -- a transação inteira deve ser abortada imediatamente com EXCEPTION (sem sanitização permissiva parcial).
    IF p_programs IS NULL OR array_length(p_programs, 1) IS NULL OR array_length(p_programs, 1) = 0 THEN
        RAISE EXCEPTION 'Pelo menos um programa deve ser selecionado para o arquivamento.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(p_programs) AS p
        WHERE p IS NULL OR p NOT IN ('OBR', 'FRC', 'FTC', 'FLL')
    ) THEN
        RAISE EXCEPTION 'A lista de programas contém elemento inválido ou inesperado. Programas permitidos exclusivamente: OBR, FRC, FTC, FLL.';
    END IF;

    SELECT ARRAY_AGG(DISTINCT p)
    INTO v_valid_programs
    FROM unnest(p_programs) AS p;

    IF 'OBR' = ANY(v_valid_programs) THEN
        v_valid_programs := v_valid_programs || ARRAY['OBR Resgate Nível 1', 'OBR Resgate Nível 2', 'OBR Artística Nível 1', 'OBR Artística Nível 2'];
    END IF;

    -- 4. Atualizar daily_logs (coluna: category, content com tratamento de nulos)
    WITH updated_logs AS (
        UPDATE public.daily_logs
        SET content = COALESCE(content, '') || E'\n[season_tag:' || v_tag || ']',
            updated_at = NOW()
        WHERE category = ANY(v_valid_programs)
          AND (content IS NULL OR content NOT LIKE '%[season_tag:%')
        RETURNING id
    )
    SELECT COUNT(*) INTO v_logs_count FROM updated_logs;

    -- 5. Atualizar priorities (coluna: category, title com tratamento de nulos)
    WITH updated_priorities AS (
        UPDATE public.priorities
        SET title = COALESCE(title, '') || ' [season_tag:' || v_tag || ']',
            updated_at = NOW()
        WHERE category = ANY(v_valid_programs)
          AND (title IS NULL OR title NOT LIKE '%[season_tag:%')
        RETURNING id
    )
    SELECT COUNT(*) INTO v_priorities_count FROM updated_priorities;

    -- 6. Atualizar prototype_tests (coluna: category, conclusion com tratamento de nulos)
    WITH updated_prototypes AS (
        UPDATE public.prototype_tests
        SET conclusion = COALESCE(conclusion, '') || E'\n[season_tag:' || v_tag || ']',
            updated_at = NOW()
        WHERE category = ANY(v_valid_programs)
          AND (conclusion IS NULL OR conclusion NOT LIKE '%[season_tag:%')
        RETURNING id
    )
    SELECT COUNT(*) INTO v_prototypes_count FROM updated_prototypes;

    -- 7. Atualizar meeting_notes (coluna: program, content com tratamento de nulos)
    WITH updated_meetings AS (
        UPDATE public.meeting_notes
        SET content = COALESCE(content, '') || E'\n[season_tag:' || v_tag || ']',
            updated_at = NOW()
        WHERE program = ANY(v_valid_programs)
          AND (content IS NULL OR content NOT LIKE '%[season_tag:%')
        RETURNING id
    )
    SELECT COUNT(*) INTO v_meetings_count FROM updated_meetings;

    v_total := v_logs_count + v_priorities_count + v_prototypes_count + v_meetings_count;

    -- 8. Obter perfil do usuário executor para auditoria
    SELECT full_name, email INTO v_user_name, v_user_email
    FROM public.profiles
    WHERE id = auth.uid();

    -- 9. Registrar operação imutável na tabela audit_logs
    INSERT INTO public.audit_logs (
        user_id,
        user_name,
        user_email,
        action_type,
        description,
        entity_name
    )
    VALUES (
        auth.uid(),
        COALESCE(v_user_name, 'Administrador'),
        COALESCE(v_user_email, 'admin@terarobotics.com'),
        'SEASON_CLOSE',
        'Encerramento transacional de temporada "' || v_tag || '" arquivando ' || v_total || ' registros (' ||
        v_logs_count || ' logs, ' || v_priorities_count || ' prioridades, ' ||
        v_prototypes_count || ' protótipos, ' || v_meetings_count || ' atas) para os programas: ' ||
        array_to_string(v_valid_programs, ', '),
        'seasons'
    );

    RETURN jsonb_build_object(
        'success', true,
        'season_tag', v_tag,
        'programs', v_valid_programs,
        'logs_count', v_logs_count,
        'priorities_count', v_priorities_count,
        'prototypes_count', v_prototypes_count,
        'meetings_count', v_meetings_count,
        'total_archived', v_total
    );
END;
$$;


COMMIT;
