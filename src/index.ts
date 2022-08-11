import { Firestore } from '@google-cloud/firestore'
import { HttpFunction } from '@google-cloud/functions-framework/build/src/functions'

const firestore = new Firestore({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS })
const COLLECTION_NAME = 'firestore-test'

export const main: HttpFunction = (req, res) => {
  if (req.method === 'POST') {
    // store/insert a new document
    const data = (req.body) || {}
    const ttl = Number.parseInt(data.ttl)
    const ciphertext = (data.ciphertext || '')
      .replace(/[^a-zA-Z0-9\-_!., ']*/g, '')
      .trim()
    const created = new Date().getTime()

    // .add() will automatically assign an ID
    return firestore.collection(COLLECTION_NAME).add({
      created,
      ttl,
      ciphertext
    }).then(doc => {
      console.info('stored new doc id#', doc.id)
      return res.status(200).send(doc)
    }).catch(err => {
      console.error(err)
      return res.status(404).send({
        error: 'unable to store',
        err
      })
    })
  }

  // everything below this requires an ID
  if (!(req.query && req.query.id)) {
    return res.status(404).send({
      error: 'No II'
    })
  }
  const id = (req.query.id as string).replace(/[^a-zA-Z0-9]/g, '').trim()
  if (!(id && id.length)) {
    return res.status(404).send({
      error: 'Empty ID'
    })
  }

  if (req.method === 'DELETE') {
    // delete an existing document by ID
    return firestore.collection(COLLECTION_NAME)
      .doc(id)
      .delete()
      .then(() => {
        return res.status(200).send({ status: 'ok' })
      }).catch(err => {
        console.error(err)
        return res.status(404).send({
          error: 'unable to delete',
          err
        })
      })
  }

  // read/retrieve an existing document by ID
  return firestore.collection(COLLECTION_NAME)
    // .doc(id)
    // .get()
    // .then(doc => {
    //   if (!(doc && doc.exists)) {
    //     return res.status(404).send({
    //       error: 'Unable to find the document'
    //     })
    //   }
    //   const data = doc.data()
    //   if (!data) {
    //     return res.status(404).send({
    //       error: 'Found document is empty'
    //     })
    //   }
    //   return res.status(200).send(data)
    // })
    .where('ciphertext', '==', id).get()
    .then(snapshot => {
      if (snapshot.size === 1) return res.status(200).send(snapshot.docs[0].data())
      else if (snapshot.size > 1) return res.status(200).send(snapshot.docs.map(doc => doc.data()))
      else return res.status(404).send('Not found')
    })
    .catch(err => {
      console.error(err)
      return res.status(404).send({
        error: 'Unable to retrieve the document',
        err
      })
    })
}

