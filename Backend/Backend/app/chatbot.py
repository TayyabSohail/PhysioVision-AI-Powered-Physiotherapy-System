import os
from langchain.schema import Document
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from mistralai import Mistral
from sentence_transformers import SentenceTransformer
import json


class EmbeddingGenerator:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts):
        embeddings = self.model.encode(texts, convert_to_tensor=True)
        return embeddings.cpu().numpy()

    def embed_query(self,texts):
        embeddings = self.model.encode(texts, convert_to_tensor = True)
        return embeddings.cpu().numpy()




class RAG:
    def __init__(self, api_key = "QsVtSj8rL1TZVL0l2usBvNPk0dF7bOMZ",  file_path= r"E:\IMPORTED FROM C\Desktop\Website_PhysioVision\PhysioVision\Backend\Backend\Database"):
        self.api_key = api_key
        self.file_path = file_path
        self.model =   "mistral-large-latest"
        self.client = Mistral( api_key=self.api_key)
        self.patient_embeddings = None
        self.patient_documents = None
        self.nutrition_embeddings = None
        self.nutrition_documents = None
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')  
        self.similarity_threshold=0.42
        
    def load_documents(self):
        self.patient_embeddings = np.load(os.path.join(self.file_path, "patient_embeddings.npy")) # Use your generated embeddings
        self.nutrition_embeddings = np.load(os.path.join(self.file_path, "nutrition_embeddings.npy"))

        # Load LangChain Document objects from your saved dataset (adjust path as necessary)
        self.patient_npy = np.load(os.path.join(self.file_path, "patient_documents.npy"), allow_pickle = True) # Load patient documents as a list of Documents
        self.nutrition_npy = np.load(os.path.join(self.file_path, "nutrition_documents.npy") , allow_pickle = True)  # Load nutrition documents as a list of Documents

        # Ensure the documents are of the correct type (Document objects)
        self.patient_documents = [Document(page_content=doc) if isinstance(doc, str) else doc for doc in self.patient_npy]
        self.nutrition_documents = [Document(page_content=doc) if isinstance(doc, str) else doc for doc in self.nutrition_npy]
    
    

    def concatinate_userdocument(self, query, user_document):
        chat_response = self.client.chat.complete(
               model= self.model,
            messages=[
                {
                    "role": "user",
                    "content": f"""
                     Generate a new query based on the original query: '{query}' by integrating relevant details from the docuemnt containing user attributes: {user_document}.  
        - If the query requests specific details (e.g., height, age), extract and incorporate only those details.  
        - Don't encorporate the the whole document if the user is only asking to query based on a specific user attribute in the old query .
        - If no specific details are mentioned, enrich the query using the full document.  
        - Ensure the new query remains natural, concise, and well-structured.  
    """

                },
            ]
        )
        #print(chat_response.choices[0].message.content.strip())
        new_query = chat_response.choices[0].message.content.strip()
        return new_query
    

    


    def adaptive_retrieval(self, user_input, embeddinggenerator, user_document):

        
        router = self.route_query(user_input)
        #print(router)
        if router == "patient":
            target_embeddings = self.patient_embeddings
            target_documents = self.patient_documents
            dataset_name = "Patient Data"
               # Convert document to string
            user_document_string = json.dumps(user_document, default=str , indent=2)  # Convert ObjectId safely
            query = self.concatinate_userdocument(user_input, user_document_string)

            
        elif router == "nutrition":
            target_embeddings = self.nutrition_embeddings
            target_documents = self.nutrition_documents
            dataset_name = "Nutrition Data"
            query = user_input
        else:
            return "No relevant dataset identified for the given query. Please refine your query."
    
        if target_embeddings.size == 0 or len(target_documents) == 0:
            return f"No documents available in {dataset_name} to retrieve data."
        
    
        chat_response = self.client.chat.complete(
               model= self.model,
            messages=[
                {
                    "role": "user",
                    "content": f"Refine the query: '{query}' for better retrieval. Make a new  better query and give that "
                },
            ]
        )

    
        refined_query = chat_response.choices[0].message.content.strip()

        print("This is the refined query",refined_query)
    
        if not target_embeddings.any() or not target_documents:
            return f"The {dataset_name} dataset is empty or invalid."

        # Step 2: Generate query embedding using Sentence-BERT
        query_embedding =  embeddinggenerator.embed_query(refined_query)

    
        similarities = cosine_similarity(query_embedding.reshape(1, -1), target_embeddings)
        
        for idx, score in enumerate(similarities[0]):
            #print(f"Document {idx} Similarity Score: {score:.4f}")
            if score >= self.similarity_threshold:
                result_doc = target_documents[idx]
                #print(result_doc.page_content)
                summary_response = self.client.chat.complete(
                  model=self.model,
                  messages= [
                                {
                                "role": "user",
                                   "content": f"""
                                     Understand the question in the query: "{refined_query}".  
                                       - Summarize an answer using relevant details from the document: {result_doc.page_content}.  
                                       - If needed, enhance the response with general knowledge.  
                                       - if the document does not provide answer to the relavent question. you can give the answer your self. This should old be done if the document does not contain the asnwer. 
                                       - Ensure the answer is clear, concise, and grammatically correct in fluent English.  
                                       - Give me the answer is paragraph format. 
                                       - Give me only the asnwer of what is asked not the irrelavent information. 
                                       - If you didn't find the document, just don't mention it in the response but give answer based on your general knowledge
                                            """
                                },
                            ] )
                summary = summary_response.choices[0].message.content.strip()
                return result_doc.page_content, summary

        return "Empty" ,"I'm sorry, your question is out of domain. You may ask about exercise and nutrition plans according to your needs or the nutrition of any food. For example: 'Give me a Weekly_Plan, my BMI = 19.9' or 'food with Caloric Value more than 10'"



    def route_query(self, input_text):
        routes = {
            "nutrition": [
                "How many calories are in food X?",
                "What’s the protein content of Y?",
                "How much sugar is in A?",
                "Tell me the nutritional facts for a C",
                "How many Carbohydtares are in a W?",
                "What is the fat content of O?",
                "How much cholesterol is in C?",
                "How much nutrition density in D",
                "What is the sodium content of A?",
                "Can you give me the nutritional breakdown of Budweiser?",
            ],
            "patient": [
                "What is the weight of person X?",
                "I am X years old?",
                "Does person Z have hypertension?",
                "What’s the BMI of the person V?",
                "Is this person diabetic?",
                "What is the Gender of A?",
                "What Nutrition does person B seek",
                "Tell me about the patient’s nutrition plan.",
                "What exercises should a person with weight X and height C with hypertension perform?",
                "What is the recovery weeks of someone at age X with hypertension immovable pain level and diabetes?",
            ]
        }

        route_embeddings = {route_name: self.encoder.encode(utterances) for route_name, utterances in routes.items()}

        input_embedding = self.encoder.encode(input_text)
        best_match = None
        highest_score = -1

        for route_name, embeddings in route_embeddings.items():
            scores = cosine_similarity([input_embedding], embeddings)
            max_score = scores.max().item()

            if max_score > highest_score:
                highest_score = max_score
                best_match = route_name
            

        return best_match


    
     
    




#Ragbot = RAG()

#Ragbot.load_documents()


#embedding_generator = EmbeddingGenerator()


#query = "Give me information on light beer"

#print(Ragbot.concatinate_userdocument(query))




