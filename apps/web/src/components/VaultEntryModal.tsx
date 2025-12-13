import React, { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export interface VaultEntryData {
  name: string;
  category: string;
  secret: string;
  type?: "text" | "file";
  mimeType?: string;
  fileName?: string;
}

interface VaultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VaultEntryData) => void;
  onDelete?: () => void;
  initialData?: VaultEntryData | null;
}

const VaultEntryModal: React.FC<VaultEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Login");
  const [secret, setSecret] = useState("");
  const [type, setType] = useState<"text" | "file">("text");
  const [mimeType, setMimeType] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCategory(initialData.category);
        setSecret(initialData.secret);
        setType(initialData.type || "text");
        setMimeType(initialData.mimeType || "");
        setFileName(initialData.fileName || "");
      } else {
        setName("");
        setCategory("Login");
        setSecret("");
        setType("text");
        setMimeType("");
        setFileName("");
      }
    }
  }, [isOpen, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSecret(base64String);
        setFileName(file.name);
        setMimeType(file.type);
        setType("file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, category, secret, type, mimeType, fileName });
    onClose();
    setName("");
    setSecret("");
    setType("text");
    setMimeType("");
    setFileName("");
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      {initialData ? "Secret Details" : "Add New Secret"}
                    </Dialog.Title>
                    <div className="mt-2">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            className="input mt-1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="category"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Category
                          </label>
                          <select
                            id="category"
                            name="category"
                            className="input mt-1"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                          >
                            <option>Login</option>
                            <option>Finance</option>
                            <option>Document</option>
                            <option>Note</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Type
                          </label>
                          <div className="mt-1 flex space-x-4">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                className="form-radio"
                                name="type"
                                value="text"
                                checked={type === "text"}
                                onChange={() => setType("text")}
                              />
                              <span className="ml-2">Text</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                className="form-radio"
                                name="type"
                                value="file"
                                checked={type === "file"}
                                onChange={() => setType("file")}
                              />
                              <span className="ml-2">File/Image</span>
                            </label>
                          </div>
                        </div>

                        {type === "text" ? (
                          <div>
                            <label
                              htmlFor="secret"
                              className="block text-sm font-medium text-gray-700"
                            >
                              Secret Content
                            </label>
                            <textarea
                              id="secret"
                              name="secret"
                              rows={3}
                              className="input mt-1"
                              value={secret}
                              onChange={(e) => setSecret(e.target.value)}
                              required={type === "text"}
                            />
                          </div>
                        ) : (
                          <div>
                            <label
                              htmlFor="file"
                              className="block text-sm font-medium text-gray-700"
                            >
                              Upload File (PDF, Image)
                            </label>
                            <div className="mt-1 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 hover:bg-gray-50 transition-colors cursor-pointer relative">
                              <div className="text-center">
                                <svg
                                  className="mx-auto h-12 w-12 text-gray-300"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                                  <label
                                    htmlFor="file"
                                    className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                                  >
                                    <span>Upload a file</span>
                                    <input
                                      id="file"
                                      name="file"
                                      type="file"
                                      className="sr-only"
                                      accept="image/*,application/pdf"
                                      onChange={handleFileChange}
                                      required={type === "file" && !secret}
                                    />
                                  </label>
                                  <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-gray-600">
                                  PNG, JPG, PDF up to 10MB
                                </p>
                              </div>
                            </div>
                            {fileName && (
                              <div className="mt-2 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                  <svg
                                    className="h-6 w-6 text-gray-400 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                    />
                                  </svg>
                                  <div className="truncate">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {fileName}
                                    </p>
                                  </div>
                                </div>
                                {secret && (
                                  <a
                                    href={secret}
                                    download={fileName}
                                    className="ml-4 text-sm font-medium text-blue-600 hover:text-blue-500"
                                  >
                                    Download
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            className="btn btn-primary w-full sm:ml-3 sm:w-auto"
                          >
                            Save
                          </button>
                          {initialData && onDelete && (
                            <button
                              type="button"
                              className="btn bg-red-600 text-white hover:bg-red-700 mt-3 w-full sm:mt-0 sm:w-auto sm:mr-auto"
                              onClick={onDelete}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default VaultEntryModal;
