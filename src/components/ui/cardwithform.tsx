"use client";
import * as React from "react"



import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function CardWithForm() {
  
  
    
        
          
        
   
       
  
 
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Get a birth chart + tarot reading</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent>
          
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="uname">Name</Label>
              <Input id="uname" name="uname" placeholder="" required/>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" placeholder="" required/>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" placeholder="" required/>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="birthday">Date of birth</Label>
              <Input id="birthday" name="birthday" placeholder="MM/DD/YYYY" required/>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="time">Time of birth</Label>
              <Input id="time" name="time" placeholder="12:00 pm" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="location">Location of birth</Label>
              <Input id="location" name="location" placeholder="City, State/District, Country"/>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="rtype">Select a reading</Label>
              <Select name="rtype">
              <SelectTrigger className="">
        <SelectValue placeholder="" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Readings</SelectLabel>
          <SelectItem value="General">General</SelectItem>
          <SelectItem value="Love">Love</SelectItem>
          <SelectItem value="Business">Business</SelectItem>
          <SelectItem value="Occult">Occult</SelectItem>
          <SelectItem value="Health">Health</SelectItem>
        </SelectGroup>
      </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="price">Select a price tier</Label>
              <Select name="price">
              <SelectTrigger className="">
        <SelectValue placeholder="" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Tier</SelectLabel>
          <SelectItem value="Essential">Essential $50</SelectItem>
          <SelectItem value="Deluxe">Deluxe $150</SelectItem>
          <SelectItem value="Ultra">Ultra $350</SelectItem>
        </SelectGroup>
      </SelectContent>
              </Select>
            </div>
          
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="questions">What questions do you have?</Label>
              <Textarea id="questions" name="questions" ></Textarea> 
            </div>
            <div className="flex flex-col space-y-1.5">
              <Button type="submit">Submit</Button>
              </div>
          </div>
          
        
      </CardContent>
      <CardFooter className="flex flex-col space-y-1.5">
      </CardFooter>
    </Card>
  )
}
