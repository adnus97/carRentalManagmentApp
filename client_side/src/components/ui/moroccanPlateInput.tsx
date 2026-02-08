import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

const ARABIC_LETTERS = [
  'أ',
  'ب',
  'ت',
  'ث',
  'ج',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ك',
  'ل',
  'م',
  'ن',
  'ه',
  'و',
  'ي',
];

export function MoroccanPlateInput({ value, onChange }: Props) {
  const [part1, setPart1] = useState('');
  const [part2, setPart2] = useState('');
  const [part3, setPart3] = useState('');

  const part2Ref = useRef<HTMLButtonElement>(null);
  const part3Ref = useRef<HTMLInputElement>(null);

  // Split value coming from form
  useEffect(() => {
    if (!value) return;
    const [a, b, c] = value.split('-');
    setPart1(a || '');
    setPart2(b || '');
    setPart3(c || '');
  }, [value]);

  function emit(a: string, b: string, c: string) {
    onChange?.(`${a}-${b}-${c}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        {/* Serial Number */}
        <Input
          value={part1}
          placeholder="12345"
          className="w-28 text-center font-mono text-lg tracking-wider 
             placeholder:text-gray-400 placeholder:font-normal"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 5);
            setPart1(v);
            emit(v, part2, part3);
            if (v.length === 5) part2Ref.current?.focus();
          }}
        />

        {/* Arabic Letter */}
        <Select
          value={part2}
          onValueChange={(v) => {
            setPart2(v);
            emit(part1, v, part3);
            part3Ref.current?.focus();
          }}
        >
          <SelectTrigger ref={part2Ref} className="w-20">
            <SelectValue placeholder="أ" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {ARABIC_LETTERS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City Code */}
        <Input
          ref={part3Ref}
          value={part3}
          placeholder="6"
          className="w-20 text-center font-mono text-lg tracking-wider
             placeholder:text-gray-400 placeholder:font-normal"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 2);
            setPart3(v);
            emit(part1, part2, v);
          }}
        />
      </div>

      {/* Preview Badge */}
      {(part1 || part2 || part3) && (
        <div
          className="inline-flex items-center gap-2 
               border rounded-md px-4 py-2
               font-mono text-lg tracking-wide"
        >
          <span>🇲🇦</span>

          <span className="w-16 text-center">{part1 || '12345'}</span>

          <span>|</span>

          <span className="w-10 text-center font-sans" dir="rtl">
            {part2 || 'أ'}
          </span>

          <span>|</span>

          <span className="w-6 text-center">{part3 || '6'}</span>
        </div>
      )}
    </div>
  );
}
