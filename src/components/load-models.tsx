/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import Image from 'next/image'
import { Button } from './ui/button'
import { Plus, Trash } from 'lucide-react'
import { Input } from './ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Loading } from './loading'

interface TrainingImages {
  label: string
  file: string[]
  training: faceapi.LabeledFaceDescriptors
  descriptors: Float32Array[]
}

interface TrainingImage {
  file?: HTMLImageElement
  label?: string
  detections?:
    | faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<
          {
            detection: faceapi.FaceDetection
          },
          faceapi.FaceLandmarks68
        >
      >
    | undefined
}

export function LoadModels() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const [loadingTitle, setLoadingTitle] = useState('Carregando imagens')

  const [trainingImages, setTrainingImages] = useState<TrainingImages[]>([])
  const [currentImage, setCurrentImage] = useState<TrainingImage>()

  const [imageToCompare, setImageToCompare] = useState<string>()

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadModels = async () => {
      setLoadingTitle('Carregando modelos...')
      setIsLoading(true)
      const modelsPath = process.env.NEXT_PUBLIC_BASE_PATH || ''

      const modelsUrl = `${modelsPath}/models`

      Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromUri(modelsUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelsUrl),
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelsUrl),
      ]).then(() => {
        setIsLoading(false)
        setLoadingTitle('')
      })
    }
    loadModels()
  }, [])

  async function handleSubmitTrainingImage() {
    const currentImageDescriptor = currentImage?.detections?.descriptor

    const alreadyHaveLabel = trainingImages.find(
      (img) => img.label === currentImage?.label,
    )

    if (currentImageDescriptor && alreadyHaveLabel) {
      const updatedDescriptors = [
        ...alreadyHaveLabel.descriptors,
        currentImageDescriptor,
      ]

      const labeledImages = new faceapi.LabeledFaceDescriptors(
        currentImage?.label || '',
        updatedDescriptors,
      )

      const currentTrainingImages = [...trainingImages]
      const currentIndex = currentTrainingImages.findIndex(
        (item) => alreadyHaveLabel.label === item.label,
      )

      const updatedTrainingImage: TrainingImages = {
        ...alreadyHaveLabel,
        training: labeledImages,
        file: [...alreadyHaveLabel.file, currentImage.file?.src || ''],
        descriptors: updatedDescriptors,
      }

      currentTrainingImages.splice(currentIndex, 1, updatedTrainingImage)

      setTrainingImages(currentTrainingImages)
    } else if (currentImageDescriptor) {
      const updatedDescriptors = [currentImageDescriptor]

      const labeledImages = new faceapi.LabeledFaceDescriptors(
        currentImage?.label || '',
        updatedDescriptors,
      )

      const currentTrainingImages = [...trainingImages]

      const newTrainingImage: TrainingImages = {
        label: currentImage.label || '',
        file: [currentImage.file?.src || ''],
        training: labeledImages,
        descriptors: updatedDescriptors,
      }

      currentTrainingImages.push(newTrainingImage)

      setTrainingImages(currentTrainingImages)
    }

    setIsAddModalOpen(false)
  }

  async function handleChangeImage(image: File | undefined) {
    if (!image) return
    setLoadingTitle('Carregando imagem...')
    setIsLoading(true)

    const parsedImage = await faceapi.bufferToImage(image)

    const detections = await faceapi
      .detectSingleFace(parsedImage)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detections) {
      return 'ERRO'
    }

    setCurrentImage({
      ...currentImage,
      file: parsedImage,
      detections,
    })
    setIsLoading(false)
    setLoadingTitle('')
  }

  async function handleValidateInputedImage(image: File | undefined) {
    if (!image) return 'ERRO'

    const faceMatcher = new faceapi.FaceMatcher(
      trainingImages.map((item) => item.training),
      0.6,
    )

    const reader = new FileReader()

    reader.onloadend = () => {
      setImageToCompare(reader.result as string)
    }

    reader.readAsDataURL(image)

    const loadedImage = await faceapi.bufferToImage(image)

    // @ts-ignore
    faceapi.matchDimensions(canvasRef.current, imageRef.current)

    const detections = await faceapi
      .detectAllFaces(loadedImage)
      .withFaceLandmarks()
      .withFaceDescriptors()
    const resizedDetections = faceapi.resizeResults(detections, {
      width: (imageRef.current as HTMLImageElement).width,
      height: (imageRef.current as HTMLImageElement).height,
    })

    const results = resizedDetections.map((d) =>
      faceMatcher.findBestMatch(d.descriptor),
    )
    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: result.toString(),
      })
      drawBox.draw(canvasRef.current as unknown as HTMLCanvasElement)
    })
  }

  return (
    <section className="mx-auto flex max-w-6xl  flex-col items-start justify-center gap-2">
      <div className="flex w-full items-center justify-between gap-2">
        <h1 className="flex gap-2 text-lg font-semibold">
          Imagens de treinamento
        </h1>
        <Dialog
          onOpenChange={(value) => setIsAddModalOpen(value)}
          open={isAddModalOpen}
        >
          <DialogTrigger asChild>
            <Button variant="default" size="sm" className="flex gap-1">
              Adicionar imagem
              <Plus size={20}></Plus>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar nova imagem para treinamento</DialogTitle>
              <DialogDescription>
                A imagem adicionada aqui será utilizada para treinamento do
                modelo. Por favor utilize apenas imagens contendo um rosto
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="label">Digite o identificador do rosto</Label>

              <Input
                id="label"
                type="text"
                placeholder="Person name"
                onChange={(event) =>
                  setCurrentImage((prev) => ({
                    ...prev,
                    label: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="face">Envie a imagem de um rosto</Label>

              <Input
                id="face"
                type="file"
                onChange={(event) => {
                  const image = event?.target?.files?.[0] as File
                  handleChangeImage(image)
                }}
              />
            </div>

            <Button variant="default" onClick={handleSubmitTrainingImage}>
              Cadastrar nova imagem de treinamento
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-row flex-wrap gap-4">
        {trainingImages.length === 0 && <span>Nenhuma imagem cadastrada</span>}
        {trainingImages.map((img) => (
          <Card key={img.label} className="h-fit w-64">
            <CardHeader>
              <CardTitle>
                {img.label === '' ? 'Sem rótulo' : img.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-start gap-2 ">
                {img.file.map((file) => (
                  <div
                    key={file}
                    className="flex w-full items-center justify-between rounded-md bg-secondary p-2"
                  >
                    <Image
                      src={file}
                      alt={img.label}
                      width={10}
                      height={10}
                      className="h-12 w-12 rounded-md"
                    ></Image>

                    <Button variant="destructive" size="icon" disabled>
                      <Trash size={24}></Trash>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h1 className="mt-4 flex gap-2 text-lg font-semibold">
        Validação do treinamento
      </h1>

      {trainingImages.length === 0 && (
        <p>
          Para realizar a validação, é necessário realizar o treinamento com
          algum rosto
        </p>
      )}

      {trainingImages.length > 0 && (
        <>
          <Label htmlFor="identify">Imagem para comparação</Label>
          <Input
            type="file"
            id="identify"
            onChange={(event) => {
              const image = event?.target?.files?.[0] as File
              handleValidateInputedImage(image)
            }}
          />
        </>
      )}

      <div className="relative">
        {imageToCompare && (
          <>
            <Image
              ref={imageRef}
              src={imageToCompare || ''}
              width={1000}
              height={1000}
              alt="Selected image"
              className="h-[1000px] w-[1000px]"
            ></Image>
            <canvas
              className="absolute left-0 top-0"
              ref={canvasRef}
              width={1000}
              height={1000}
            ></canvas>
          </>
        )}
      </div>

      <Loading isLoading={isLoading} title={loadingTitle}></Loading>
    </section>
  )
}
