import React from 'react';
import {formErrorMessage} from '@/lib/formRecovery';
export default function FormSaveError({error}) {
 return error?<p role="alert" className="rounded-lg border border-red-600/50 bg-red-600/10 p-3 text-sm text-red-200">{formErrorMessage(error)}</p>:null;
}
