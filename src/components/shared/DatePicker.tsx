import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ value, onChange, className, placeholder }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value + 'T00:00:00') : new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month's days
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Days of current month
    const currentDate = value ? new Date(value + 'T00:00:00') : null;
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();

    for (let day = 1; day <= totalDays; day++) {
      const isSelected = currentDate?.getFullYear() === year &&
                         currentDate?.getMonth() === month &&
                         currentDate?.getDate() === day;
      const isToday = year === todayYear && month === todayMonth && day === todayDay;

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-md text-sm transition-colors",
            isSelected
              ? "bg-brand text-white hover:bg-brand hover:text-white font-bold"
              : isToday
              ? "bg-brand-light text-brand font-semibold ring-1 ring-brand hover:bg-brand hover:text-white"
              : "text-text-secondary hover:bg-brand-light hover:text-brand"
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          type="text"
          value={value || ''}
          readOnly
          placeholder={placeholder || "YYYY-MM-DD"}
          onClick={() => setIsOpen(true)}
          className="pr-10 cursor-pointer"
        />
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[320px] p-4" hideClose>
          <DialogHeader className="pb-2 border-b border-border-subtle">
            <DialogTitle className="text-sm font-bold flex items-center justify-between">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-hover rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
              <div className="flex items-center gap-1">
                <button onClick={handleNextMonth} className="p-1 hover:bg-hover rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <DialogClose className="p-1 hover:bg-hover rounded">
                  <X className="w-4 h-4 text-status-red" />
                </DialogClose>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-7 gap-1 mt-4 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-[10px] font-bold text-text-quaternary uppercase">
                {day}
              </div>
            ))}
            {renderCalendar()}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border-subtle flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                setViewDate(today);
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const d = String(today.getDate()).padStart(2, '0');
                onChange(`${y}-${m}-${d}`);
                setIsOpen(false);
              }}
              className="text-xs text-brand hover:text-brand"
            >
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { onChange(''); setIsOpen(false); }} className="text-xs">
              Clear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
