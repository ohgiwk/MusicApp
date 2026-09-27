import type { ReactNode } from 'react'
import type { AnswerKind } from '../../hooks/useEarSession'

const TEXT: Record<AnswerKind, { title: string; color: string }> = {
  correct: { title: '正解！', color: '#22c98c' },
  partial: { title: 'おしい！', color: '#ffb020' },
  wrong: { title: 'ざんねん…', color: '#9a94b8' },
}

/** 回答後の結果表示 (正解！ +120 / 3 COMBO / 実際の音程差) */
export function FeedbackBanner({ kind, gained, combo, children }: { kind: AnswerKind; gained: number; combo: number; children?: ReactNode }) {
  const t = TEXT[kind]
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-2">
        <span className="animate-pop text-3xl font-extrabold" style={{ color: t.color }}>
          {t.title}
        </span>
        {gained > 0 && (
          <span className="animate-pop chip bg-sun text-sm text-white" style={{ animationDelay: '0.1s' }}>
            +{gained}
          </span>
        )}
      </div>
      {kind === 'correct' && combo >= 3 && (
        <span className="animate-pop text-shine text-xl font-extrabold" style={{ animationDelay: '0.15s' }}>
          {combo} COMBO!
        </span>
      )}
      {children && <div className="font-bold">{children}</div>}
    </div>
  )
}
