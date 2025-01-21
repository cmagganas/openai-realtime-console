export const languageTools = [
  {
    type: "function",
    name: "add_new_word",
    description: "Used to help add new words learned in another language into a list or JSON.",
    parameters: {
      type: "object",
      properties: {
        target_language: {
          type: "string",
          description: "The language in which the new word is being learned, e.g., German."
        },
        native_language: {
          type: "string",
          description: "The learner's primary language, e.g., English."
        },
        word: {
          type: "string",
          description: "The new word being learned in the target language."
        },
        translation: {
          type: "string",
          description: "The translation of the new word into the native language."
        }
      },
      required: ["target_language", "native_language", "word", "translation"]
    }
  }
];
