import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // 基本スタイル
          "flex h-10 w-full rounded-lg border px-3 py-2 text-base transition-colors",
          // 背景色とテキスト色
          "bg-white text-gray-900",
          // プレースホルダー色
          "placeholder:text-gray-400",
          // ボーダー色（デフォルトとフォーカス）
          "border-gray-300 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600",
          // エラー状態（上書き可能）
          "[&.border-red-500]:border-red-500 [&.border-red-500]:focus:border-red-500 [&.border-red-500]:focus:ring-red-500",
          // ファイル入力
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-900",
          // 無効状態
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }