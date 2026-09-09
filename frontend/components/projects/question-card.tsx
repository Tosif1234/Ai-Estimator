import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { RotateCcw, CheckCircle2, Sparkles, PenLine } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Question {
  id: string
  question: string
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  status: "PENDING" | "ANSWERED" | "SKIPPED"
  moduleName?: string
  gapId?: string
  answer?: string
  options?: string[]
  allowCustomAnswer?: boolean
}

interface QuestionCardProps {
  question: Question
  onAnswer: (id: string, answer: string) => Promise<void>
  onSkip: (id: string) => Promise<void>
}

export function QuestionCard({ question, onAnswer, onSkip }: QuestionCardProps) {
  const [isAnswering, setIsAnswering] = React.useState(false)
  const [isSkipping, setIsSkipping] = React.useState(false)
  // When a skipped question has "Answer Now" clicked, we show the answer form
  const [isReanswering, setIsReanswering] = React.useState(false)

  const hasOptions = Array.isArray(question.options) && question.options.length > 0;
  const allowCustom = question.allowCustomAnswer ?? true;
  const recommendedOption = hasOptions && question.options?.[0] ? question.options[0] : null;
  
  const [selectedOption, setSelectedOption] = React.useState<string>("")
  
  const showTextarea = !hasOptions || selectedOption === "__OTHER__"

  const answerSchema = z.object({
    customAnswer: showTextarea 
      ? z.string().trim().min(1, "Answer is required.")
      : z.string().optional()
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(answerSchema),
    defaultValues: { customAnswer: question.answer || "" }
  })

  const handleAnswerSubmit = async (data: { customAnswer?: string }) => {
    let finalAnswer = "";
    
    if (hasOptions && selectedOption && selectedOption !== "__OTHER__") {
      finalAnswer = selectedOption;
    } else if (showTextarea && data.customAnswer) {
      finalAnswer = data.customAnswer.trim();
    }
    
    if (!finalAnswer) {
       return;
    }

    setIsAnswering(true)
    try {
      await onAnswer(question.id, finalAnswer)
      setIsReanswering(false)
      setSelectedOption("")
      reset()
    } finally {
      setIsAnswering(false)
    }
  }

  const handleSkip = async () => {
    setIsSkipping(true)
    try {
      // If question has a recommended option (first option), auto-select and submit it as the answer
      if (recommendedOption) {
        await onAnswer(question.id, recommendedOption)
      } else {
        await onSkip(question.id)
      }
      reset()
    } finally {
      setIsSkipping(false)
    }
  }

  const handleCancelReanswerMode = () => {
    setIsReanswering(false)
    setSelectedOption("")
    reset()
  }

  const isAnswered = question.status === "ANSWERED"
  const isSkipped = question.status === "SKIPPED"
  // A card is "locked/completed" only if answered; skipped cards can re-open
  const isLocked = isAnswered
  const showForm = !isLocked && (!isSkipped || isReanswering)
  const isSubmitDisabled = isAnswering || isSkipping || (hasOptions && !selectedOption)

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-150 shadow-xs p-4 sm:p-5 space-y-3.5",
        isAnswered
          ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20"
          : isSkipped && !isReanswering
          ? "border-amber-200 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/20"
          : "border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 bg-white dark:bg-[#0e1322]"
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {question.moduleName && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {question.moduleName}
              </span>
            )}
            <StatusBadge status={question.priority} />
          </div>
          <h3 className="text-sm sm:text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">
            {question.question}
          </h3>
        </div>

        <div className="shrink-0">
          {isAnswered ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Answered
            </span>
          ) : isSkipped ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
              Skipped
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
              Pending
            </span>
          )}
        </div>
      </div>

      <div>
        {isAnswered && question.answer ? (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-[#0b0f19] p-3.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Confirmed Client Answer</p>
                {recommendedOption && question.answer === recommendedOption && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                    <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    Recommended Choice
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
                onClick={() => {
                  setIsReanswering(true)
                  setSelectedOption(hasOptions && question.options?.includes(question.answer!) ? question.answer! : (hasOptions ? "__OTHER__" : ""))
                  reset({ customAnswer: question.answer })
                }}
              >
                Edit Answer
              </Button>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{question.answer}</p>
          </div>
        ) : isSkipped && !isReanswering ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-3.5">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">This question was skipped.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                You can answer it now to provide more context to the estimation model.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-xl border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 bg-white dark:bg-[#151b2c] w-full sm:w-auto"
              onClick={() => {
                setIsReanswering(true)
                setSelectedOption("")
                reset({ customAnswer: "" })
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Answer Now
            </Button>
          </div>
        ) : showForm ? (
          <form id={`answer-form-${question.id}`} onSubmit={handleSubmit(handleAnswerSubmit)} className="space-y-3.5">
            {isReanswering && (
              <p className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 font-normal">
                Updating your answer will refine your architectural scope.
              </p>
            )}
            {hasOptions && (
              <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-2">
                {question.options!.map((opt, i) => {
                  const isRecommended = i === 0;
                  const isSelected = selectedOption === opt;
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "group relative flex items-start space-x-3 p-3.5 rounded-xl border transition-all duration-100 cursor-pointer text-xs sm:text-sm",
                        isSelected
                          ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-indigo-600/30 dark:ring-indigo-500/30"
                          : isRecommended
                          ? "border-indigo-200 dark:border-indigo-900/50 bg-[#faf8ff] dark:bg-[#111625] hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 bg-white dark:bg-[#0b0f19]"
                      )} 
                      onClick={() => setSelectedOption(opt)}
                    >
                      <RadioGroupItem value={opt} id={`q-${question.id}-opt-${i}`} className="mt-0.5 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 cursor-pointer">
                        <Label htmlFor={`q-${question.id}-opt-${i}`} className="font-medium text-xs sm:text-sm cursor-pointer leading-relaxed text-slate-900 dark:text-white">
                          {opt}
                        </Label>
                        {isRecommended && (
                          <span className="inline-flex items-center gap-1 self-start sm:self-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 shrink-0">
                            <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {allowCustom && (
                  <div 
                    className={cn(
                      "flex items-start space-x-3 p-3.5 rounded-xl border transition-all duration-100 cursor-pointer text-xs sm:text-sm",
                      selectedOption === "__OTHER__"
                        ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-indigo-600/30 dark:ring-indigo-500/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 bg-white dark:bg-[#0b0f19]"
                    )} 
                    onClick={() => setSelectedOption("__OTHER__")}
                  >
                    <RadioGroupItem value="__OTHER__" id={`q-${question.id}-opt-other`} className="mt-0.5 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                    <div className="flex-1 flex items-center justify-between gap-2 cursor-pointer">
                      <Label htmlFor={`q-${question.id}-opt-other`} className="font-semibold text-xs sm:text-sm cursor-pointer flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <PenLine className="h-3.5 w-3.5 text-slate-400" />
                        Write your own answer
                      </Label>
                      <span className="text-xs text-slate-400 font-normal">Custom input</span>
                    </div>
                  </div>
                )}
              </RadioGroup>
            )}
            
            {showTextarea && (
              <div className="space-y-1.5 pt-1">
                <Textarea 
                  placeholder={hasOptions ? "Write your custom answer here..." : "Provide exact details or constraints here..."}
                  className="min-h-[90px] resize-y text-sm rounded-xl border-slate-200 dark:border-slate-800 dark:bg-[#111625] dark:text-white dark:placeholder:text-slate-500 p-3.5 leading-relaxed focus-visible:ring-indigo-500"
                  {...register("customAnswer")}
                />
                {errors.customAnswer && <p className="text-xs text-red-500">{errors.customAnswer.message}</p>}
              </div>
            )}
          </form>
        ) : null}
      </div>

      {showForm && (
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          {isReanswering ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelReanswerMode}
                disabled={isAnswering}
                type="button"
                className="h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                form={`answer-form-${question.id}`}
                disabled={isSubmitDisabled}
                className="h-10 px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs w-full sm:w-auto"
              >
                {isAnswering ? "Saving..." : "Save Answer"}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSkip} 
                disabled={isAnswering || isSkipping}
                type="button"
                className="h-10 px-4 text-xs sm:text-sm gap-2 rounded-xl font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
              >
                {isSkipping ? (
                  "Applying..."
                ) : recommendedOption ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Skip (Use Recommended)
                  </>
                ) : (
                  "Skip for now"
                )}
              </Button>
              <Button 
                size="sm"
                type="submit" 
                form={`answer-form-${question.id}`}
                disabled={isSubmitDisabled}
                className="h-10 px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs w-full sm:w-auto"
              >
                {isAnswering ? "Submitting..." : "Submit Answer"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
