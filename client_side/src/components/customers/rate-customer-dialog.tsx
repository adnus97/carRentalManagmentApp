'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rateCustomer, Customer } from '@/api/customers';
import { toast } from '@/components/ui/toast';

export function RateCustomerDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => rateCustomer(customer!.id, { rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({
        queryKey: ['customerRatings', customer!.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['customerRatingsSummary', customer!.id],
      }); // ✅ ensure count updates
      toast({
        type: 'success',
        title: 'Rated',
        description: 'Customer rated successfully',
      });
      onOpenChange(false);
      setRating(0);
      setHoverRating(0);
      setComment('');
    },
    onError: () => {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to rate customer',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          Rate {customer?.firstName} {customer?.lastName}
        </DialogTitle>

        {/* Stars with hover effect */}
        <div className="flex gap-2 my-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`cursor-pointer text-2xl transition-colors ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400'
                  : 'text-[var(--gray-8)]'
              }`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >
              ★
            </span>
          ))}
        </div>

        {/* Comment */}
        <Textarea
          placeholder="Optional comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full"
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || rating === 0}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
