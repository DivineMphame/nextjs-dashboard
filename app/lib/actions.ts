'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/* =========================
   INVOICE SCHEMAS
========================= */

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

/* =========================
   STATE TYPE
========================= */

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

/* =========================
   CREATE INVOICE
========================= */

export async function createInvoice(
  prevState: State,
  formData: FormData,
): Promise<State> {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error(error);
    return { message: 'Database Error: Failed to Create Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

/* =========================
   UPDATE INVOICE (✅ FIXED)
========================= */

// Support both the curried server-action style used with `useActionState`
// and older direct-call signatures like `updateInvoice(id, formData)`.
export function updateInvoice(id: string): ((
  prevState: State,
  formData: FormData,
) => Promise<State>);
export function updateInvoice(id: string, formData: FormData): Promise<State>;
export function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
): Promise<State>;
export function updateInvoice(
  id: string,
  prevStateOrFormData?: State | FormData,
  maybeFormData?: FormData,
) {
  async function coreUpdate(_id: string, formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
      };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    try {
      await sql`
        UPDATE invoices
        SET customer_id = ${customerId},
            amount = ${amountInCents},
            status = ${status}
        WHERE id = ${_id}
      `;
    } catch (error) {
      console.error(error);
      return { message: 'Database Error: Failed to Update Invoice.' };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

  // Called as `updateInvoice(id)` -> return curried action
  if (typeof prevStateOrFormData === 'undefined') {
    return async function (
      _prevState: State,
      formData: FormData,
    ): Promise<State> {
      const res = await coreUpdate(id, formData);
      // If coreUpdate returned a State object, return it; otherwise return {} as State
      return (res as State) ?? ({} as State);
    };
  }

  // Called as `updateInvoice(id, formData)` (legacy) -> prevStateOrFormData is FormData
  if (
    typeof (prevStateOrFormData as FormData).get === 'function' &&
    maybeFormData === undefined
  ) {
    return coreUpdate(id, prevStateOrFormData as FormData) as Promise<State>;
  }

  // Called as `updateInvoice(id, prevState, formData)` -> handle directly
  return coreUpdate(id, maybeFormData as FormData) as Promise<State>;
}

/* =========================
   DELETE INVOICE
========================= */

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}

/* =========================
   AUTHENTICATION
========================= */

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
