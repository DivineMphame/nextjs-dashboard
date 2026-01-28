'use client';

import { CustomerField, InvoiceForm } from '@/app/lib/definitions';
import {
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { State } from '@/app/lib/actions';
import { useActionState } from 'react';

export default function EditInvoiceForm({
  invoice,
  customers,
  updateAction,
}: {
  invoice: InvoiceForm;
  customers: CustomerField[];
  updateAction: (prevState: State, formData: FormData) => Promise<State>;
}) {
  const initialState: State = { message: null, errors: {} };

  const [state, formAction] = useActionState(updateAction, initialState);

  return (
    <form action={formAction}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {state.message && (
          <p className="mb-4 text-sm text-red-600">{state.message}</p>
        )}

        {/* Customer */}
        <div className="mb-4">
          <label htmlFor="customer" className="mb-2 block text-sm font-medium">
            Choose customer
          </label>
          <div className="relative">
            <select
              id="customer"
              name="customerId"
              defaultValue={invoice.customer_id}
              aria-invalid={!!state.errors?.customerId}
              className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm"
            >
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <UserCircleIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          </div>
          {state.errors?.customerId && (
            <p className="mt-1 text-xs text-red-600">
              {state.errors.customerId.join(', ')}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label htmlFor="amount" className="mb-2 block text-sm font-medium">
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            defaultValue={invoice.amount}
            aria-invalid={!!state.errors?.amount}
            className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm"
          />
          {state.errors?.amount && (
            <p className="mt-1 text-xs text-red-600">
              {state.errors.amount.join(', ')}
            </p>
          )}
        </div>

        {/* Status */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Invoice status
          </legend>

          <label className="mr-4">
            <input
              type="radio"
              name="status"
              value="pending"
              defaultChecked={invoice.status === 'pending'}
            />{' '}
            Pending
          </label>

          <label>
            <input
              type="radio"
              name="status"
              value="paid"
              defaultChecked={invoice.status === 'paid'}
            />{' '}
            Paid
          </label>

          {state.errors?.status && (
            <p className="mt-1 text-xs text-red-600">
              {state.errors.status.join(', ')}
            </p>
          )}
        </fieldset>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/invoices"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm"
        >
          Cancel
        </Link>
        <Button type="submit">Edit Invoice</Button>
      </div>
    </form>
  );
}
