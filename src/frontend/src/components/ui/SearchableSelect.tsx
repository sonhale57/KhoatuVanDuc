import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Check, ChevronsUpDown, Search } from "lucide-react";

interface Option {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onValueChange: (value: any) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Chọn mục...",
  searchPlaceholder = "Tìm kiếm...",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full justify-between text-left font-normal bg-background hover:bg-accent/5 h-9 px-3"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-50 slide-in-from-top-1">
          <div className="flex items-center border-b border-border/80 px-2 pb-1.5 pt-0.5">
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[11px] shadow-none"
            />
          </div>
          <div className="pt-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-xs text-muted-foreground/60 justify-center italic">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground transition-colors ${
                    value === opt.value ? "bg-accent text-accent-foreground font-semibold" : ""
                  }`}
                >
                  {value === opt.value && (
                    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </span>
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">{opt.sublabel}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
